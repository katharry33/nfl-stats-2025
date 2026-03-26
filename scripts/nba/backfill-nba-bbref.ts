#!/usr/bin/env tsx
// scripts/backfill-nba-bbref.ts
//
// Backfills nbaProps_{season} with historical game-by-game data from BBRef.
// Uses the existing bball.ts scraper — no BDL required.
//
// Each player's full season log is fetched from Basketball Reference.
// One Firestore doc is written per player × prop × game.
// gameStat is populated immediately; enrichment adds averages + analytics.
//
// Usage:
//   npx tsx scripts/backfill-nba-bbref.ts --season=2024          → 2024-25 season
//   npx tsx scripts/backfill-nba-bbref.ts --season=2024 --dry-run
//   npx tsx scripts/backfill-nba-bbref.ts --season=2024 --player="Nikola Jokic"
//   npx tsx scripts/backfill-nba-bbref.ts --season=2023          → 2023-24 season

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// ─── Firebase init ────────────────────────────────────────────────────────────
function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) { try { return cert(key.startsWith('{') ? JSON.parse(key) : key); } catch {} }
  const p  = process.env.FIREBASE_PROJECT_ID;
  const e  = process.env.FIREBASE_CLIENT_EMAIL;
  const k  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (p && e && k) return cert({ projectId: p, clientEmail: e, privateKey: k });
  const kp = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(kp)) { try { return cert(JSON.parse(fs.readFileSync(kp, 'utf-8'))); } catch {} }
  return applicationDefault();
}
const fbApp = getApps().length ? getApp()
  : initializeApp({ credential: getCredential(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7' });
const db = getFirestore(fbApp);

// ─── BBRef helpers (inlined to avoid @/ import issues in scripts) ─────────────

interface BRGame {
  gameNum: number;
  date:    string;
  pts:     number;
  ast:     number;
  reb:     number;
  stl:     number;
  blk:     number;
  tov:     number;
  fg3m:    number;
  fg3a:    number;
  fgm:     number;
  fga:     number;
  ftm:     number;
  fta:     number;
  mp:      string;
}

const BR_CACHE = new Map<string, BRGame[]>();

async function fetchSeasonLog(playerName: string, brid: string, season: number): Promise<BRGame[]> {
  const cacheKey = `${brid}:${season}`;
  if (BR_CACHE.has(cacheKey)) return BR_CACHE.get(cacheKey)!;

  // BBRef URL uses the ending year: 2024-25 season → /gamelog/2025/
  // But our season convention: season=2024 means 2024-25, ending year = 2025
  const endYear = season + 1;
  const url = `https://www.basketball-reference.com/players/${brid[0].toLowerCase()}/${brid}/gamelog/${endYear}/`;
  console.log(`  📥 BBRef: ${playerName} (${season}-${String(endYear).slice(2)}): ${url}`);

  try {
    await sleep(2500 + Math.random() * 1000); // polite delay — BBRef rate limits hard

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (res.status === 429) {
      console.log('  ⏳ BBRef rate limited — waiting 30s...');
      await sleep(30_000);
      BR_CACHE.set(cacheKey, []);
      return [];
    }

    if (!res.ok) {
      console.warn(`  ⚠️  BBRef HTTP ${res.status} for ${playerName}`);
      BR_CACHE.set(cacheKey, []);
      return [];
    }

    const html  = await res.text();
    const games = parseBRGameLog(html);
    BR_CACHE.set(cacheKey, games);
    console.log(`  ✅ ${games.length} games parsed`);
    return games;
  } catch (err) {
    console.warn(`  ❌ BBRef error for ${playerName}:`, err);
    BR_CACHE.set(cacheKey, []);
    return [];
  }
}

function parseBRGameLog(html: string): BRGame[] {
  const games: BRGame[] = [];

  // Table ID is "player_game_log_reg" (confirmed from debug).
  // BBRef also wraps it in an HTML comment on some pages — try both.
  let tableHtml: string | null = null;

  // Strategy 1: direct table by known ID
  const directMatch = html.match(/<table[^>]*id="player_game_log_reg"[^>]*>([\s\S]*?)<\/table>/i);
  if (directMatch) tableHtml = directMatch[1];

  // Strategy 2: same table inside HTML comment (BBRef sometimes does this)
  if (!tableHtml) {
    // Extract all HTML comments and look for one containing the table
    const commentRegex = /<!--([\s\S]*?)-->/g;
    let cm: RegExpExecArray | null;
    while ((cm = commentRegex.exec(html)) !== null) {
      if (cm[1].includes('player_game_log_reg') || 
          (cm[1].includes('data-stat="date"') && cm[1].includes('data-stat="pts"') && cm[1].includes('data-stat="mp"'))) {
        tableHtml = cm[1];
        break;
      }
    }
  }

  // Strategy 3: find any table containing the right combination of stats
  if (!tableHtml) {
    // Use a line-by-line approach to avoid catastrophic backtracking on 400KB HTML
    const lines = html.split('\n');
    let inTable = false;
    let depth   = 0;
    let buffer  = '';
    for (const line of lines) {
      if (!inTable) {
        if (line.includes('<table') && (line.includes('data-stat') || true)) {
          inTable = true;
          depth   = (line.match(/<table/gi) ?? []).length;
          buffer  = line;
        }
      } else {
        buffer += '\n' + line;
        depth  += (line.match(/<table/gi)  ?? []).length;
        depth  -= (line.match(/<\/table>/gi) ?? []).length;
        if (depth <= 0) {
          // Check if this table has game log columns
          if (buffer.includes('data-stat="date"') && buffer.includes('data-stat="pts"') && buffer.includes('data-stat="mp"')) {
            tableHtml = buffer;
            break;
          }
          inTable = false;
          buffer  = '';
          depth   = 0;
        }
      }
    }
  }

  if (!tableHtml) {
    console.warn('  ❌ BBRef: No game log table found (tried player_game_log_reg + comment + scan)');
    return games;
  }

  // Parse rows — skip header rows and summary rows (nested tables)
  // Real game rows: have data-stat="date" AND data-stat="pts" AND no nested <table>
  const rowRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const trAttrs = rowMatch[1];
    const rowHtml = rowMatch[2];

    // Skip thead rows
    if (trAttrs.includes('thead') || rowHtml.includes('<th') && !rowHtml.includes('<td')) continue;

    // Skip summary/aggregate rows that contain nested tables
    if (rowHtml.includes('<table')) continue;

    // Skip spacer/separator rows
    if (trAttrs.includes('partial_table') || trAttrs.includes('thead')) continue;

    const cell = (stat: string): string => {
      const pattern = new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, 'i');
      const m = rowHtml.match(pattern);
      if (!m) return '';
      const val  = m[1];
      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      return (link ? link[1] : val).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    // Skip DNP/inactive rows
    const reason = cell('reason');
    if (reason && reason.trim().length > 0) continue;

    // Date — BBRef 2024+ uses "date" not "date_game"
    const dateVal = cell('date') || cell('date_game');
    if (!dateVal || !/\d{4}-\d{2}-\d{2}/.test(dateVal)) continue;

    // Minutes played — skip if absent (DNP indicator)
    const mp = cell('mp');
    if (!mp || mp.trim() === '' || mp.includes('Did Not') || mp.includes('Inactive')) continue;

    // Game number — try all known field names
    const gnStr = cell('player_game_num_career') || cell('team_game_num_season') || cell('game_season') || cell('ranker');
    const gameNum = parseInt(gnStr, 10);
    if (isNaN(gameNum) || gameNum < 1) continue;

    games.push({
      gameNum,
      date:  dateVal,
      pts:   parseFloat(cell('pts'))  || 0,
      ast:   parseFloat(cell('ast'))  || 0,
      reb:   parseFloat(cell('trb'))  || 0,
      stl:   parseFloat(cell('stl'))  || 0,
      blk:   parseFloat(cell('blk'))  || 0,
      tov:   parseFloat(cell('tov'))  || 0,
      fg3m:  parseFloat(cell('fg3'))  || 0,
      fg3a:  parseFloat(cell('fg3a')) || 0,
      fgm:   parseFloat(cell('fg'))   || 0,
      fga:   parseFloat(cell('fga'))  || 0,
      ftm:   parseFloat(cell('ft'))   || 0,
      fta:   parseFloat(cell('fta'))  || 0,
      mp,
    });
  }

  return games;
}

// ─── Prop map ─────────────────────────────────────────────────────────────────
// Maps canonical prop name → field on BRGame

const PROP_MAP: Record<string, keyof BRGame> = {
  points:    'pts',
  assists:   'ast',
  rebounds:  'reb',
  steals:    'stl',
  blocks:    'blk',
  threes:    'fg3m',
  turnovers: 'tov',
};

// ─── Args ─────────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const SEASON       = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2024', 10);
const DRY          = args.includes('--dry-run');
const SINGLE       = args.find(a => a.startsWith('--player='))?.split('=').slice(1).join('=') ?? '';

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const colName = `nbaProps_${SEASON}`;
  // BBRef uses ending year: season=2024 → 2024-25 → ending year 2025
  const endYear = SEASON + 1;

  console.log(`\n🏀 NBA BBRef Historical Backfill`);
  console.log(`   Collection: ${colName}`);
  console.log(`   Season:     ${SEASON}-${String(endYear).slice(2)} (BBRef year: ${endYear})`);
  console.log(`   Dry run:    ${DRY}`);
  console.log(`   Player:     ${SINGLE || 'all'}`);
  console.log('='.repeat(55));

  // Load player map
  const brSnap = await db.collection('static_brIdMap').get();
  const players: Array<{ player: string; brid: string; team: string }> = [];

  brSnap.docs.forEach(d => {
    const r = d.data();
    if (!r.brid || !r.player || r.brid === 'VERIFY') return;
    if (SINGLE && r.player !== SINGLE) return;
    players.push({ player: r.player, brid: r.brid, team: r.team ?? 'UNK' });
  });

  // Also load team from nbaIdMap for richer team data
  const nbaIdSnap = await db.collection('static_nbaIdMap').get();
  const teamMap: Record<string, string> = {};
  nbaIdSnap.docs.forEach(d => {
    const r = d.data();
    if (r.player && r.team) teamMap[r.player] = r.team;
  });

  console.log(`\n📋 ${players.length} players with verified BBRef IDs\n`);

  let totalGames = 0;
  let totalDocs  = 0;

  for (const player of players) {
    const team = teamMap[player.player] ?? player.team ?? 'UNK';

    const games = await fetchSeasonLog(player.player, player.brid, SEASON);

    if (games.length === 0) {
      console.log(`  ⚠️  No games — skipping ${player.player}`);
      continue;
    }

    totalGames += games.length;
    let playerDocs = 0;

    if (!DRY) {
      let batch      = db.batch();
      let batchCount = 0;

      for (const game of games) {
        if (!game.date) continue;

        for (const [propNorm, field] of Object.entries(PROP_MAP)) {
          const actualStat = game[field] as number;
          const slug  = player.player.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const docId = `nba-hist-${slug}-${propNorm}-${game.date}`;

          batch.set(db.collection(colName).doc(docId), {
            // Identity
            league:   'nba',
            season:   SEASON,
            player:   player.player,
            team,
            prop:     propNorm,
            gameDate: game.date,
            brid:     player.brid,

            // No line from historical — enrichment uses this as game log reference
            line:      null,
            overUnder: null,
            odds:      null,
            matchup:   null,

            // The actual result IS known from BBRef
            gameStat:     actualStat,
            actualResult: null, // needs a line to determine hit/miss

            // Enrichment fields — filled by /api/nba/enrich
            playerAvg:         null,
            seasonHitPct:      null,
            opponentRank:      null,
            opponentAvgVsStat: null,
            scoreDiff:         null,
            confidenceScore:   null,
            projWinPct:        null,
            avgWinProb:        null,
            bestEdgePct:       null,
            expectedValue:     null,
            kellyPct:          null,
            impliedProb:       null,
            valueIcon:         null,

            source:    'bbref_historical',
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          batchCount++;
          playerDocs++;
          totalDocs++;

          if (batchCount >= 490) {
            await batch.commit();
            batch      = db.batch();
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) await batch.commit();
    } else {
      // Dry run — just count
      playerDocs = games.length * Object.keys(PROP_MAP).length;
      totalDocs += playerDocs;
    }

    console.log(`  ✅ ${player.player}: ${games.length} games → ${playerDocs} docs ${DRY ? '(dry run)' : 'written'}`);
  }

  console.log(`\n✅ Done`);
  console.log(`   Players:   ${players.length}`);
  console.log(`   Games:     ${totalGames}`);
  console.log(`   Docs:      ${totalDocs} ${DRY ? '(would be written)' : 'written'}`);

  if (!DRY && totalDocs > 0) {
    console.log(`\n📊 Next: run enrichment to fill playerAvg, hitPct, confidence`);
    console.log(`   curl "http://localhost:3000/api/nba/enrich?mode=all&season=${SEASON}&force=false"`);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });