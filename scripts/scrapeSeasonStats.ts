// scripts/scrapeSeasonStats.ts
// Scrapes PFR season-level player stats + TeamRankings defense stats → Firestore
//
// Usage:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/scrapeSeasonStats.ts --season=2024
//   npx dotenv-cli -e .env.local -- npx tsx scripts/scrapeSeasonStats.ts --season=2025

import 'dotenv/config';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Firebase — supports both JSON blob and split env vars ─────────────────────
function getCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) return cert(JSON.parse(raw));
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey });
  throw new Error('No Firebase credentials found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
}
const app = getApps().length ? getApp() : initializeApp({ credential: getCredential() });
const db  = getFirestore(app, '(default)');

// ── Args ──────────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const season = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2024', 10);

// Day after Super Bowl for TeamRankings date param
const SEASON_END_DATES: Record<number, string> = {
  2023: '2024-02-12',
  2024: '2025-02-10',
  2025: '2026-02-09',
};
const dateParam = SEASON_END_DATES[season] ?? `${season + 1}-02-10`;

// ── Fetch helper ──────────────────────────────────────────────────────────────
const SCRAPER_KEY = process.env.SCRAPER_API_KEY;

async function fetchHtml(rawUrl: string): Promise<string | null> {
  const url = SCRAPER_KEY
    ? `https://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(rawUrl)}`
    : rawUrl;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sleep(1200 + Math.random() * 800);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) return res.text();
      console.warn(`   HTTP ${res.status}`);
      if (res.status === 403 || res.status === 429) await sleep(6000 * (attempt + 1));
    } catch (e) {
      if (attempt === 2) { console.warn(`   Fetch error: ${e}`); return null; }
      await sleep(3000);
    }
  }
  return null;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── PFR table extractor ───────────────────────────────────────────────────────
// PFR wraps tables in HTML comments — unwrap them
function extractTable(html: string, tableId: string): string | null {
  // First try: unwrap from comment
  const commentRe = new RegExp(`<!--([\\s\\S]*?id="${tableId}"[\\s\\S]*?)-->`, 'i');
  const commentMatch = html.match(commentRe);
  if (commentMatch) {
    const tableRe = new RegExp(`<table[^>]*id="${tableId}"[^>]*>[\\s\\S]*?<\\/table>`, 'i');
    const m = commentMatch[1].match(tableRe);
    if (m) return m[0];
  }
  // Second try: direct in HTML
  const directRe = new RegExp(`<table[^>]*id="${tableId}"[^>]*>[\\s\\S]*?<\\/table>`, 'i');
  const direct = html.match(directRe);
  return direct ? direct[0] : null;
}

function cellText(rowHtml: string, dataStat: string): string {
  const m = rowHtml.match(new RegExp(`data-stat="${dataStat}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<a[^>]*>([^<]*)<\/a>/g, '$1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getPlayerName(rowHtml: string): string {
  const m = rowHtml.match(/data-stat="player"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
  return m ? m[1].trim() : '';
}

// ── Parse PFR player table ────────────────────────────────────────────────────
interface PlayerStat { player: string; team: string; games: number; perGame: number; }

function parsePfrPlayerTable(html: string, tableId: string, totalCol: string): PlayerStat[] {
  const tableHtml = extractTable(html, tableId);
  if (!tableHtml) {
    console.log(`\n   ❌ Table id="${tableId}" not found (HTML size: ${Math.round(html.length/1024)}KB)`);
    const pos = html.indexOf(`id="${tableId}"`);
    console.log(`   Position search: ${pos >= 0 ? `found at ${pos}` : 'NOT found'}`);
    return [];
  }

  const results: PlayerStat[] = [];
  const seen = new Set<string>();
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(tableHtml)) !== null) {
    const row = m[1];
    if (!row.includes('<td')) continue;

    const player = getPlayerName(row);
    if (!player) continue;

    const team  = cellText(row, 'team_name_abbr') || cellText(row, 'team');
    // Skip multi-team TOT rows
    if (/^\d+TM$/i.test(team)) continue;
    // Keep first entry for each player (handles traded players)
    if (seen.has(player)) continue;
    seen.add(player);

    const games = parseInt(cellText(row, 'g'), 10);
    const total = parseFloat(cellText(row, totalCol));
    if (isNaN(games) || games <= 0 || isNaN(total)) continue;

    results.push({
      player,
      team: team.toUpperCase(),
      games,
      perGame: Math.round((total / games) * 10) / 10,
    });
  }

  return results;
}

// ── TeamRankings parser ───────────────────────────────────────────────────────
function parseTeamRankings(html: string): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  let rank = 0;

  while ((m = rowRe.exec(tableMatch[1])) !== null) {
    const row = m[1];
    if (!row.includes('<td')) continue;
    rank++;

    const teamMatch = row.match(/<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    if (!teamMatch) continue;
    const abbr = mapTeamName(teamMatch[1].trim());
    if (!abbr) continue;

    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tds.length < 2) continue;
    const avg = parseFloat(tds[1][1].replace(/<[^>]+>/g, '').trim());
    if (isNaN(avg)) continue;

    result[abbr] = { rank, avg };
  }
  return result;
}

function mapTeamName(name: string): string | null {
  const n = name.split('(')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'arizona': 'ARI', 'atlanta': 'ATL', 'baltimore': 'BAL', 'buffalo': 'BUF',
    'carolina': 'CAR', 'chicago': 'CHI', 'cincinnati': 'CIN', 'cleveland': 'CLE',
    'dallas': 'DAL', 'denver': 'DEN', 'detroit': 'DET', 'green bay': 'GB',
    'houston': 'HOU', 'indianapolis': 'IND', 'jacksonville': 'JAX', 'kansas city': 'KC',
    'las vegas': 'LV', 'la rams': 'LAR', 'los angeles rams': 'LAR',
    'la chargers': 'LAC', 'los angeles chargers': 'LAC',
    'miami': 'MIA', 'minnesota': 'MIN', 'new england': 'NE', 'new orleans': 'NO',
    'ny giants': 'NYG', 'new york giants': 'NYG', 'ny jets': 'NYJ', 'new york jets': 'NYJ',
    'philadelphia': 'PHI', 'pittsburgh': 'PIT', 'san francisco': 'SF',
    'seattle': 'SEA', 'tampa bay': 'TB', 'tennessee': 'TEN', 'washington': 'WAS',
  };
  return map[n] ?? null;
}

// ── Firestore writers ─────────────────────────────────────────────────────────
async function savePlayerStats(stats: PlayerStat[], propNorm: string): Promise<number> {
  const key = propNorm.replace(/\s/g, '_');
  const BATCH_SIZE = 400;
  let saved = 0;

  for (let i = 0; i < stats.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { player, team, games, perGame } of stats.slice(i, i + BATCH_SIZE)) {
      const docId = `${player.replace(/[^a-zA-Z0-9]/g, '_')}_${season}`;
      batch.set(
        db.collection('static_playerSeasonStats').doc(docId),
        { player, season, team, games, [key]: perGame, _updatedAt: new Date().toISOString() },
        { merge: true }
      );
      saved++;
    }
    await batch.commit();
  }
  return saved;
}

async function saveDefenseStats(
  defStats: Record<string, { rank: number; avg: number }>,
  propNorm: string
): Promise<number> {
  const key = propNorm.replace(/\s/g, '_');
  const BATCH_SIZE = 400;
  const entries = Object.entries(defStats);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const [team, { rank, avg }] of entries.slice(i, i + BATCH_SIZE)) {
      batch.set(
        db.collection('static_teamDefenseStats').doc(`${team}_${season}`),
        { team, season, [`${key}_rank`]: rank, [`${key}_avg`]: avg, _updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
    await batch.commit();
  }
  return entries.length;
}

// ── Configs ───────────────────────────────────────────────────────────────────
const PLAYER_CONFIGS = [
  { label: 'receiving yards',  tableId: 'receiving', totalCol: 'rec_yds',  propNorm: 'rec yds'  },
  { label: 'receptions',       tableId: 'receiving', totalCol: 'rec',       propNorm: 'recs'     },
  { label: 'rush yards',       tableId: 'rushing',   totalCol: 'rush_yds',  propNorm: 'rush yds' },
  { label: 'rush attempts',    tableId: 'rushing',   totalCol: 'rush_att',  propNorm: 'rush att' },
  { label: 'pass yards',       tableId: 'passing',   totalCol: 'pass_yds',  propNorm: 'pass yds' },
  { label: 'pass attempts',    tableId: 'passing',   totalCol: 'pass_att',  propNorm: 'pass att' },
  { label: 'pass completions', tableId: 'passing',   totalCol: 'pass_cmp',  propNorm: 'pass cmp' },
];

const PFR_URLS: Record<string, string> = {
  receiving: `https://www.pro-football-reference.com/years/${season}/receiving.htm`,
  rushing:   `https://www.pro-football-reference.com/years/${season}/rushing.htm`,
  passing:   `https://www.pro-football-reference.com/years/${season}/passing.htm`,
};

const DEFENSE_CONFIGS = [
  { propNorm: 'pass yds', url: `https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game?date=${dateParam}` },
  { propNorm: 'pass att', url: `https://www.teamrankings.com/nfl/stat/opponent-pass-attempts-per-game?date=${dateParam}` },
  { propNorm: 'pass cmp', url: `https://www.teamrankings.com/nfl/stat/opponent-completions-per-game?date=${dateParam}` },
  { propNorm: 'pass tds', url: `https://www.teamrankings.com/nfl/stat/opponent-passing-touchdowns-per-game?date=${dateParam}` },
  { propNorm: 'rush yds', url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game?date=${dateParam}` },
  { propNorm: 'rush att', url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-attempts-per-game?date=${dateParam}` },
  { propNorm: 'rush tds', url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-touchdowns-per-game?date=${dateParam}` },
  { propNorm: 'rec yds',  url: `https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game?date=${dateParam}` },
  { propNorm: 'recs',     url: `https://www.teamrankings.com/nfl/stat/opponent-completions-per-game?date=${dateParam}` },
  { propNorm: 'anytime td', url: `https://www.teamrankings.com/nfl/stat/opponent-touchdowns-per-game?date=${dateParam}` },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(55)}`);
  console.log(`📊 Season stats — ${season} | defense date: ${dateParam}`);
  console.log('='.repeat(55));

  // ── Player stats ──────────────────────────────────────────────────────────────
  const htmlCache = new Map<string, string>();

  for (const cfg of PLAYER_CONFIGS) {
    process.stdout.write(`⏳ ${cfg.label}... `);

    if (!htmlCache.has(cfg.tableId)) {
      const html = await fetchHtml(PFR_URLS[cfg.tableId]);
      if (!html) { console.log(`❌ fetch failed`); continue; }
      htmlCache.set(cfg.tableId, html);
    }

    const stats = parsePfrPlayerTable(htmlCache.get(cfg.tableId)!, cfg.tableId, cfg.totalCol);
    if (stats.length === 0) continue;

    const saved = await savePlayerStats(stats, cfg.propNorm);
    console.log(`✅ ${saved} players`);
  }

  // ── Defense stats ──────────────────────────────────────────────────────────────
  console.log('\n📊 Defense stats...');
  for (const cfg of DEFENSE_CONFIGS) {
    process.stdout.write(`⏳ ${cfg.propNorm}... `);
    const html = await fetchHtml(cfg.url);
    if (!html) { console.log('❌ fetch failed'); continue; }
    const defStats = parseTeamRankings(html);
    if (Object.keys(defStats).length === 0) { console.log('❌ 0 teams parsed'); continue; }
    const saved = await saveDefenseStats(defStats, cfg.propNorm);
    console.log(`✅ ${saved} teams`);
    await sleep(600);
  }

  // ── Spot checks ───────────────────────────────────────────────────────────────
  console.log('\n🔍 Spot checks...');

  // AJ Brown
  const brownSnap = await db.collection('static_playerSeasonStats')
    .where('season', '==', season).get()
    .then(s => s.docs.find(d => (d.data().player ?? '').toLowerCase().replace(/\./g,'') === 'aj brown'));
  console.log(brownSnap
    ? `✅ AJ Brown: ${JSON.stringify(brownSnap.data())}`
    : `⚠️  AJ Brown not found — check name in PFR HTML`
  );

  // DAL defense
  const dalDoc = await db.collection('static_teamDefenseStats').doc(`DAL_${season}`).get();
  console.log(dalDoc.exists
    ? `✅ DAL defense: ${JSON.stringify(dalDoc.data())}`
    : `❌ DAL not found in static_teamDefenseStats`
  );

  console.log(`\n✅ Done — ${season}\n${'='.repeat(55)}`);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });