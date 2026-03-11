import 'dotenv/config';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const credRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!credRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
const app = getApps().length ? getApp() : initializeApp({ credential: cert(JSON.parse(credRaw)) });
const db  = getFirestore(app, '(default)');

const args   = process.argv.slice(2);
const season = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2024', 10);
const SEASON_END_DATES: Record<number, string> = { 2023: '2024-02-12', 2024: '2025-02-10', 2025: '2026-02-09' };
const dateParam = SEASON_END_DATES[season] ?? `${season + 1}-02-10`;
const SCRAPER_KEY = process.env.SCRAPER_API_KEY;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(rawUrl: string): Promise<string | null> {
  const url = SCRAPER_KEY
    ? `https://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(rawUrl)}`
    : rawUrl;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sleep(1200 + Math.random() * 800);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } });
      if (res.ok) return res.text();
      if (res.status === 403 || res.status === 429) await sleep(6000 * (attempt + 1));
    } catch (e) { if (attempt === 2) return null; await sleep(3000); }
  }
  return null;
}

function extractTable(html: string, tableId: string): string | null {
  const stripped = html.replace(/<!--([\s\S]*?)-->/g, (_, i) => i.includes(`id="${tableId}"`) ? i : '');
  const m = (stripped || html).match(new RegExp(`<table[^>]*id="${tableId}"[^>]*>[\\s\\S]*?<\\/table>`, 'i'));
  return m ? m[0] : null;
}

function cellText(row: string, stat: string): string {
  const m = row.match(new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<a[^>]*>([^<]*)<\/a>/g, '$1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

interface PlayerStat { player: string; team: string; games: number; perGame: number; }

function parsePfrTable(html: string, tableId: string, totalCol: string): PlayerStat[] {
  const tableHtml = extractTable(html, tableId);
  if (!tableHtml) { console.log(`\n   ❌ Table #${tableId} not found`); return []; }

  const results: PlayerStat[] = [];
  const seen = new Set<string>();
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(tableHtml)) !== null) {
    const row = m[1];
    if (!row.includes('<td')) continue;

    // PFR uses data-stat="name_display" for player name with link
    const nameMatch = row.match(/data-stat="name_display"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;
    const player = nameMatch[1].trim();
    if (!player) continue;

    const team = cellText(row, 'team_name_abbr');
    if (/^\d+TM$/i.test(team)) continue;  // skip multi-team TOT rows
    if (seen.has(player)) continue;
    seen.add(player);

    // PFR uses data-stat="games" (not "g")
    const games = parseInt(cellText(row, 'games'), 10);
    const total = parseFloat(cellText(row, totalCol).replace(/,/g, ''));
    if (isNaN(games) || games <= 0 || isNaN(total)) continue;

    results.push({ player, team: team.toUpperCase(), games, perGame: Math.round((total / games) * 10) / 10 });
  }
  return results;
}

// TeamRankings: class="tr-table datatable scrollable", values in data-sort attr
function parseTeamRankings(html: string): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};
  // Match table with tr-table class
  const tableM = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableM) return result;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  let rank = 0;

  while ((m = rowRe.exec(tableM[1])) !== null) {
    const row = m[1];
    if (!row.includes('<td')) continue;

    // Rank cell: data-sort="1"
    const rankM = row.match(/class="[^"]*rank[^"]*"[^>]*data-sort="(\d+)"/i);
    if (!rankM) continue;
    rank = parseInt(rankM[1], 10);

    // Team cell: <a href="...">Baltimore</a>
    const teamM = row.match(/<td[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/nfl\/team\/[^"]*">([^<]+)<\/a>/i);
    if (!teamM) continue;
    const abbr = mapTeam(teamM[1].trim());
    if (!abbr) continue;

    // Value: second data column, use data-sort for precision
    const valM = row.match(/<td[^>]*class="[^"]*text-right[^"]*"[^>]*data-sort="([^"]+)"/i);
    if (!valM) continue;
    const avg = parseFloat(valM[1]);
    if (isNaN(avg)) continue;

    result[abbr] = { rank, avg: Math.round(avg * 10) / 10 };
  }
  return result;
}

function mapTeam(name: string): string | null {
  const n = name.trim().toLowerCase();
  const map: Record<string, string> = {
    'arizona': 'ARI', 'atlanta': 'ATL', 'baltimore': 'BAL', 'buffalo': 'BUF',
    'carolina': 'CAR', 'chicago': 'CHI', 'cincinnati': 'CIN', 'cleveland': 'CLE',
    'dallas': 'DAL', 'denver': 'DEN', 'detroit': 'DET', 'green bay': 'GB',
    'houston': 'HOU', 'indianapolis': 'IND', 'jacksonville': 'JAX', 'kansas city': 'KC',
    'las vegas': 'LV', 'la rams': 'LAR', 'los angeles rams': 'LAR',
    'la chargers': 'LAC', 'los angeles chargers': 'LAC', 'miami': 'MIA',
    'minnesota': 'MIN', 'new england': 'NE', 'new orleans': 'NO',
    'ny giants': 'NYG', 'new york giants': 'NYG', 'ny jets': 'NYJ', 'new york jets': 'NYJ',
    'philadelphia': 'PHI', 'pittsburgh': 'PIT', 'san francisco': 'SF',
    'seattle': 'SEA', 'tampa bay': 'TB', 'tennessee': 'TEN', 'washington': 'WAS',
  };
  return map[n] ?? null;
}

async function savePlayerStats(stats: PlayerStat[], propNorm: string): Promise<number> {
  const key = propNorm.replace(/\s/g, '_');
  let saved = 0;
  for (let i = 0; i < stats.length; i += 400) {
    const batch = db.batch();
    for (const { player, team, games, perGame } of stats.slice(i, i + 400)) {
      const docId = `${player.replace(/[^a-zA-Z0-9]/g, '_')}_${season}`;
      batch.set(db.collection('static_playerSeasonStats').doc(docId),
        { player, season, team, games, [key]: perGame, _updatedAt: new Date().toISOString() },
        { merge: true });
      saved++;
    }
    await batch.commit();
  }
  return saved;
}

async function saveDefenseStats(stats: Record<string, { rank: number; avg: number }>, propNorm: string): Promise<number> {
  const key = propNorm.replace(/\s/g, '_');
  const entries = Object.entries(stats);
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch();
    for (const [team, { rank, avg }] of entries.slice(i, i + 400)) {
      batch.set(db.collection('static_teamDefenseStats').doc(`${team}_${season}`),
        { team, season, [`${key}_rank`]: rank, [`${key}_avg`]: avg, _updatedAt: new Date().toISOString() },
        { merge: true });
    }
    await batch.commit();
  }
  return entries.length;
}

const PLAYER_CONFIGS = [
  { label: 'receiving yards',  tableId: 'receiving', totalCol: 'rec_yds',  propNorm: 'rec yds'  },
  { label: 'receptions',       tableId: 'receiving', totalCol: 'rec',       propNorm: 'recs'     },
  { label: 'rush yards',       tableId: 'rushing',   totalCol: 'rush_yds',  propNorm: 'rush yds' },
  { label: 'rush attempts',    tableId: 'rushing',   totalCol: 'rush_att',  propNorm: 'rush att' },
  { label: 'pass yards',       tableId: 'passing',   totalCol: 'pass_yds',  propNorm: 'pass yds' },
  { label: 'pass attempts',    tableId: 'passing',   totalCol: 'pass_att',  propNorm: 'pass att' },
  { label: 'completions',      tableId: 'passing',   totalCol: 'pass_cmp',  propNorm: 'pass cmp' },
];

const PFR_URLS: Record<string, string> = {
  receiving: `https://www.pro-football-reference.com/years/${season}/receiving.htm`,
  rushing:   `https://www.pro-football-reference.com/years/${season}/rushing.htm`,
  passing:   `https://www.pro-football-reference.com/years/${season}/passing.htm`,
};

const DEFENSE_CONFIGS = [
  { propNorm: 'pass yds',   url: `https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game?date=${dateParam}` },
  { propNorm: 'pass att',   url: `https://www.teamrankings.com/nfl/stat/opponent-pass-attempts-per-game?date=${dateParam}` },
  { propNorm: 'pass cmp',   url: `https://www.teamrankings.com/nfl/stat/opponent-completions-per-game?date=${dateParam}` },
  { propNorm: 'pass tds',   url: `https://www.teamrankings.com/nfl/stat/opponent-passing-touchdowns-per-game?date=${dateParam}` },
  { propNorm: 'rush yds',   url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game?date=${dateParam}` },
  { propNorm: 'rush att',   url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-attempts-per-game?date=${dateParam}` },
  { propNorm: 'rush tds',   url: `https://www.teamrankings.com/nfl/stat/opponent-rushing-touchdowns-per-game?date=${dateParam}` },
  { propNorm: 'rec yds',    url: `https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game?date=${dateParam}` },
  { propNorm: 'recs',       url: `https://www.teamrankings.com/nfl/stat/opponent-completions-per-game?date=${dateParam}` },
  { propNorm: 'anytime td', url: `https://www.teamrankings.com/nfl/stat/opponent-touchdowns-per-game?date=${dateParam}` },
];

async function main() {
  console.log(`\n${'='.repeat(55)}\n📊 Season ${season} | defense date: ${dateParam}\n${'='.repeat(55)}`);

  const htmlCache = new Map<string, string>();
  for (const cfg of PLAYER_CONFIGS) {
    process.stdout.write(`⏳ ${cfg.label}... `);
    if (!htmlCache.has(cfg.tableId)) {
      const html = await fetchHtml(PFR_URLS[cfg.tableId]);
      if (!html) { console.log('❌ fetch failed'); continue; }
      htmlCache.set(cfg.tableId, html);
    }
    const stats = parsePfrTable(htmlCache.get(cfg.tableId)!, cfg.tableId, cfg.totalCol);
    if (!stats.length) { console.log('❌ 0 players parsed'); continue; }
    const saved = await savePlayerStats(stats, cfg.propNorm);
    console.log(`✅ ${saved} players`);
  }

  console.log('\n📊 Defense...');
  for (const cfg of DEFENSE_CONFIGS) {
    process.stdout.write(`⏳ ${cfg.propNorm}... `);
    const html = await fetchHtml(cfg.url);
    if (!html) { console.log('❌ fetch failed'); continue; }
    const stats = parseTeamRankings(html);
    if (!Object.keys(stats).length) { console.log('❌ 0 teams parsed'); continue; }
    const saved = await saveDefenseStats(stats, cfg.propNorm);
    console.log(`✅ ${saved} teams`);
    await sleep(500);
  }

  // Spot checks
  const allDocs = await db.collection('static_playerSeasonStats').where('season', '==', season).get();
  const brown = allDocs.docs.find(d => (d.data().player ?? '').toLowerCase().replace(/\./g, '') === 'aj brown');
  console.log('\n🔍 AJ Brown:', brown ? JSON.stringify(brown.data()) : 'NOT FOUND');
  const dal = await db.collection('static_teamDefenseStats').doc(`DAL_${season}`).get();
  console.log('🔍 DAL defense:', dal.exists ? JSON.stringify(dal.data()) : 'NOT FOUND');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
