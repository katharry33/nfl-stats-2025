#!/usr/bin/env tsx
// scripts/seed-nba-defense-stats.ts
//
// Snapshots current NBA opponent defense stats from TeamRankings into Firestore.
// Writes to static_nbaTeamDefenseStats — used by enrichAllNBAPropsCollection()
// for historical backfill so it doesn't hit TeamRankings on every run.
//
// Run at the end of each season (or on demand) to capture a frozen snapshot:
//   npx tsx scripts/seed-nba-defense-stats.ts --season=2025
//   npx tsx scripts/seed-nba-defense-stats.ts --season=2025 --date=2025-04-13
//
// The optional --date flag passes ?date= to TeamRankings to get rankings
// frozen at a specific point in the season (useful for mid-season snapshots).

import 'dotenv/config';
import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// ─── Firebase init ────────────────────────────────────────────────────────────
function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) { try { return cert(key.startsWith('{') ? JSON.parse(key) : key); } catch {} }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey });
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try { return cert(JSON.parse(fs.readFileSync(keyPath, 'utf-8'))); } catch {}
  }
  return applicationDefault();
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: getCredential(),
      projectId:  process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7',
    });
const db = getFirestore(app);

// ─── TeamRankings config ──────────────────────────────────────────────────────

const CONFIG = [
  { propNorm: 'points',    url: 'https://www.teamrankings.com/nba/stat/opponent-points-per-game' },
  { propNorm: 'rebounds',  url: 'https://www.teamrankings.com/nba/stat/opponent-total-rebounds-per-game' },
  { propNorm: 'assists',   url: 'https://www.teamrankings.com/nba/stat/opponent-assists-per-game' },
  { propNorm: 'steals',    url: 'https://www.teamrankings.com/nba/stat/opponent-steals-per-game' },
  { propNorm: 'blocks',    url: 'https://www.teamrankings.com/nba/stat/opponent-blocks-per-game' },
  { propNorm: 'threes',    url: 'https://www.teamrankings.com/nba/stat/opponent-three-pointers-made-per-game' },
  { propNorm: 'turnovers', url: 'https://www.teamrankings.com/nba/stat/opponent-turnovers-per-game' },
] as const;

const NBA_TEAM_MAP: Record<string, string> = {
  'atlanta': 'ATL', 'atlanta hawks': 'ATL',
  'boston': 'BOS', 'boston celtics': 'BOS',
  'brooklyn': 'BKN', 'brooklyn nets': 'BKN',
  'charlotte': 'CHA', 'charlotte hornets': 'CHA',
  'chicago': 'CHI', 'chicago bulls': 'CHI',
  'cleveland': 'CLE', 'cleveland cavaliers': 'CLE',
  'dallas': 'DAL', 'dallas mavericks': 'DAL',
  'denver': 'DEN', 'denver nuggets': 'DEN',
  'detroit': 'DET', 'detroit pistons': 'DET',
  'golden state': 'GSW', 'golden state warriors': 'GSW', 'gs warriors': 'GSW',
  'houston': 'HOU', 'houston rockets': 'HOU',
  'indiana': 'IND', 'indiana pacers': 'IND',
  'la clippers': 'LAC', 'los angeles clippers': 'LAC',
  'la lakers': 'LAL', 'los angeles lakers': 'LAL',
  'memphis': 'MEM', 'memphis grizzlies': 'MEM',
  'miami': 'MIA', 'miami heat': 'MIA',
  'milwaukee': 'MIL', 'milwaukee bucks': 'MIL',
  'minnesota': 'MIN', 'minnesota timberwolves': 'MIN',
  'new orleans': 'NOP', 'new orleans pelicans': 'NOP',
  'new york': 'NYK', 'new york knicks': 'NYK', 'ny knicks': 'NYK',
  'oklahoma city': 'OKC', 'oklahoma city thunder': 'OKC', 'okla city': 'OKC',
  'orlando': 'ORL', 'orlando magic': 'ORL',
  'philadelphia': 'PHI', 'philadelphia 76ers': 'PHI',
  'phoenix': 'PHX', 'phoenix suns': 'PHX',
  'portland': 'POR', 'portland trail blazers': 'POR',
  'sacramento': 'SAC', 'sacramento kings': 'SAC',
  'san antonio': 'SAS', 'san antonio spurs': 'SAS',
  'toronto': 'TOR', 'toronto raptors': 'TOR',
  'utah': 'UTA', 'utah jazz': 'UTA',
  'washington': 'WAS', 'washington wizards': 'WAS',
};

function mapTeam(name: string): string | null {
  return NBA_TEAM_MAP[name.split('(')[0].trim().toLowerCase()] ?? null;
}

// ─── HTML parser (identical to defense.ts) ───────────────────────────────────

function parseTable(html: string): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let rank = 0;

  while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
    const row = rowMatch[1];
    if (row.includes('<th') || !row.includes('<td')) continue;
    rank++;

    const teamMatch = row.match(/<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    if (!teamMatch) continue;

    const abbr = mapTeam(teamMatch[1].trim());
    if (!abbr) { console.log(`  ⚠️  Unmapped: "${teamMatch[1].trim()}"`); continue; }

    const tds = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)];
    if (tds.length < 2) continue;

    const avg = parseFloat(tds[1][1].trim());
    if (!isNaN(avg)) result[abbr] = { rank, avg };
  }

  return result;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml',
        'Referer':    'https://www.teamrankings.com/nba/',
      },
    });
    if (!res.ok) { console.warn(`  HTTP ${res.status} for ${url}`); return null; }
    return res.text();
  } catch (err) {
    console.warn(`  Network error: ${err}`); return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2);
  const season = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
  const date   = args.find(a => a.startsWith('--date='))?.split('=')[1] ?? '';

  console.log(`\n🛡️  NBA Defense Stats Seed — season=${season}${date ? ` date=${date}` : ' (live/current)'}`);
  console.log('='.repeat(55));

  // Accumulate all stats per team before writing
  // Shape: teamAbbr → { points_rank, points_avg, rebounds_rank, ... }
  const teamStats: Record<string, Record<string, number>> = {};

  for (const { propNorm, url } of CONFIG) {
    const fullUrl = date ? `${url}?date=${date}` : url;
    process.stdout.write(`  ${propNorm.padEnd(12)}`);

    const html = await fetchHtml(fullUrl);
    if (!html) { console.log('❌  fetch failed'); continue; }

    const parsed = parseTable(html);
    const count  = Object.keys(parsed).length;

    if (count < 28) {
      console.log(`⚠️   Only ${count}/30 teams parsed`);
    } else {
      console.log(`✅  ${count} teams`);
    }

    for (const [abbr, { rank, avg }] of Object.entries(parsed)) {
      if (!teamStats[abbr]) teamStats[abbr] = {};
      teamStats[abbr][`${propNorm}_rank`] = rank;
      teamStats[abbr][`${propNorm}_avg`]  = avg;
    }

    await sleep(700);
  }

  const teams = Object.keys(teamStats);
  console.log(`\n📊 ${teams.length} teams with data — writing to static_nbaTeamDefenseStats…`);

  // Write one doc per team, keyed by "TEAM_ABBR_SEASON" e.g. "GSW_2025"
  const batch = db.batch();
  const now   = new Date().toISOString();

  for (const [abbr, stats] of Object.entries(teamStats)) {
    const docId = `${abbr}_${season}`;
    batch.set(
      db.collection('static_nbaTeamDefenseStats').doc(docId),
      {
        team:      abbr,
        season,
        snapshotDate: date || now.split('T')[0],
        updatedAt: now,
        ...stats,
        // Also write combo prop components so enrichAllNBAPropsCollection
        // can derive pts_ast_reb etc. without additional lookups
      },
      { merge: true },
    );
  }

  await batch.commit();

  console.log(`✅ Wrote ${teams.length} team docs to static_nbaTeamDefenseStats`);
  console.log(`\n   Doc ID format: TEAM_SEASON (e.g. "OKC_2025")`);
  console.log(`   Fields per doc: points_rank, points_avg, rebounds_rank, ...\n`);

  // Print a quick spot-check
  const okc = teamStats['OKC'];
  if (okc) {
    console.log('   OKC spot-check:');
    for (const [k, v] of Object.entries(okc)) {
      console.log(`     ${k.padEnd(22)} ${v}`);
    }
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });