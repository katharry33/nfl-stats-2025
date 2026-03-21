#!/usr/bin/env tsx
// scripts/backfill-nba-2024.ts
//
// Populates nbaProps_2024 with historical NBA 2023-24 season prop data.
// Source of truth: BallDontLie historical stats (/v1/stats with seasons[]=2024)
//
// Two phases:
//   Phase 1: Pull BDL box scores for the 2023-24 season for your tracked players
//            and write synthetic "prop" documents (one per player/stat/game)
//   Phase 2: Run enrichment to add BBRef averages, hit %, defense stats, scoring
//
// Usage:
//   npx tsx scripts/backfill-nba-2024.ts                  → full backfill
//   npx tsx scripts/backfill-nba-2024.ts --dry-run        → preview, no writes
//   npx tsx scripts/backfill-nba-2024.ts --enrich-only    → skip phase 1, just enrich
//   npx tsx scripts/backfill-nba-2024.ts --player="Nikola Jokic"  → single player
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' }); // fallback
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
const app = getApps().length ? getApp()
  : initializeApp({ credential: getCredential(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7' });
const db = getFirestore(app);

// ─── Config ───────────────────────────────────────────────────────────────────
const BDL_API_KEY  = process.env.BDL_API_KEY ?? process.env.BDL_API_KEY ?? process.env.BALLDONTLIE_API_KEY ?? '';
const BDL_BASE = 'https://api.balldontlie.io/v1';

// Props we want to create historical records for
const PROP_MAP: Record<string, string> = {
  pts:      'points',
  ast:      'assists',
  reb:      'rebounds',
  stl:      'steals',
  blk:      'blocks',
  fg3m:     'threes',
  turnover: 'turnovers',
};

// ─── Args ─────────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const DRY          = args.includes('--dry-run');
const ENRICH_ONLY  = args.includes('--enrich-only');
const SINGLE_PLAYER = args.find(a => a.startsWith('--player='))?.split('=').slice(1).join('=') ?? '';

// ─── Load player ID map ───────────────────────────────────────────────────────

async function loadIdMaps(): Promise<{
  players: Array<{ player: string; bdlId: number; team: string; brid: string }>;
}> {
  const snap = await db.collection('static_nbaIdMap').get();
  const players: Array<{ player: string; bdlId: number; team: string; brid: string }> = [];

  snap.docs.forEach(d => {
    const r = d.data();
    if (!r.bdlId || !r.player) return;
    if (SINGLE_PLAYER && r.player !== SINGLE_PLAYER) return;
    players.push({
      player: r.player,
      bdlId:  Number(r.bdlId),
      team:   r.team ?? 'UNK',
      brid:   r.brid ?? r.bbrId ?? '',
    });
  });

  return { players };
}

// ─── BDL stats fetch ──────────────────────────────────────────────────────────
// Fetches all game stats for a player in the 2023-24 season (BDL season=2023)
// BDL uses the starting year for the season: 2023-24 = season 2023

interface BDLStat {
  id:       number;
  date:     string;  // "2024-01-15"
  gameId:   number;
  homeTeam: string;
  awayTeam: string;
  pts:      number;
  ast:      number;
  reb:      number;
  stl:      number;
  blk:      number;
  fg3m:     number;
  turnover: number;
  min:      string;
}

async function fetchBDLSeasonStats(bdlId: number, bdlSeason: number): Promise<BDLStat[]> {
  const stats: BDLStat[] = [];
  let cursor: number | null = null;

  do {
   // In fetchBDLSeasonStats, replace the params with:
const params = new URLSearchParams({
    'player_ids[]': String(bdlId),
    'start_date':   '2024-10-22',  // 2024-25 season start
    'end_date':     '2025-06-22',  // 2024-25 season end (projected)
    per_page:       '100',
  });
    if (cursor) params.set('cursor', String(cursor));

    const res = await fetch(`${BDL_BASE}/stats?${params}`, {
      headers: { Authorization: BDL_API_KEY },
    });

    if (res.status === 429) {
      console.log('  ⏳ BDL rate limit — waiting 65s...');
      await sleep(65_000);
      continue;
    }
    if (!res.ok) { console.warn(`  ⚠️  BDL stats HTTP ${res.status}`); break; }

    const json = await res.json();
    for (const s of json.data ?? []) {
      const minStr = String(s.min ?? '').trim();
      if (!minStr || minStr === '0' || minStr.startsWith('0:')) continue; // DNP

      stats.push({
        id:       s.id,
        date:     s.game?.date ?? '',
        gameId:   s.game?.id ?? 0,
        homeTeam: s.game?.home_team_id ? String(s.game.home_team_id) : '',
        awayTeam: s.game?.visitor_team_id ? String(s.game.visitor_team_id) : '',
        pts:      s.pts      ?? 0,
        ast:      s.ast      ?? 0,
        reb:      s.reb      ?? 0,
        stl:      s.stl      ?? 0,
        blk:      s.blk      ?? 0,
        fg3m:     s.fg3m     ?? 0,
        turnover: s.turnover ?? 0,
        min:      minStr,
      });
    }

    cursor = json.meta?.next_cursor ?? null;
    await sleep(800); // stay under free tier
  } while (cursor);

  return stats;
}

// ─── Matchup lookup ───────────────────────────────────────────────────────────
// We need team abbreviations for the matchup string.
// BDL game objects use team IDs — we'll fetch team data once.

let teamCache: Record<number, string> = {};

async function loadTeams(): Promise<void> {
  try {
    const res  = await fetch(`${BDL_BASE}/teams?per_page=30`, { headers: { Authorization: BDL_API_KEY } });
    const json = await res.json();
    for (const t of json.data ?? []) {
      teamCache[t.id] = t.abbreviation ?? t.full_name;
    }
    console.log(`  🏀 Loaded ${Object.keys(teamCache).length} NBA teams`);
  } catch (err) {
    console.warn('  ⚠️  Could not load team list — matchups will be incomplete');
  }
}

// ─── Write props to Firestore ─────────────────────────────────────────────────

async function writePropsForPlayer(
  player:    { player: string; bdlId: number; team: string; brid: string },
  stats:     BDLStat[],
  season:    number,
): Promise<number> {
  const colName = `nbaProps_${season}`;
  let written = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const stat of stats) {
    for (const [bdlField, propNorm] of Object.entries(PROP_MAP)) {
      const actualValue = (stat as any)[bdlField] ?? 0;
      const gameDate    = stat.date?.split('T')[0] ?? '';

      if (!gameDate) continue;

      // Deterministic doc ID — same format as ingest route
      const slug  = player.player.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const docId = `nba-hist-${slug}-${propNorm}-${gameDate}`;

      const doc = {
        league:   'nba',
        season,
        player:   player.player,
        team:     player.team,
        prop:     propNorm,
        gameDate,
        bdlId:    player.bdlId,
        brid:     player.brid || null,

        // We don't have a line from historical data — set to null
        // enrichment will still compute playerAvg and hit% from BBRef
        line:              null,
        overUnder:         null,
        odds:              null,
        bestOdds:          null,
        bestBook:          null,
        matchup:           null, // enrichment can fill from schedule

        // The actual game result IS known
        gameStat:     actualValue,
        actualResult: null, // can't determine without a line

        // Enrichment fields
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

        // Source
        source:    'bdl_historical',
        updatedAt: new Date().toISOString(),
      };

      if (!DRY) {
        batch.set(db.collection(colName).doc(docId), doc, { merge: true });
        batchCount++;
        written++;
      } else {
        written++;
      }

      if (batchCount >= 490) {
        await batch.commit();
        batch      = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0 && !DRY) await batch.commit();
  return written;
}

// ─── Phase 2: trigger enrichment ─────────────────────────────────────────────

async function triggerEnrichment(season: number): Promise<void> {
  // Import the enrichment function directly to avoid HTTP call in a script
  console.log('\n📊 Phase 2: Triggering enrichment for nbaProps_' + season + '...');
  console.log('   Run this command to enrich:');
  console.log(`   curl "http://localhost:3000/api/nba/enrich?mode=all&season=${season}&force=false"`);
  console.log('\n   Or run the enrichment script directly:');
  console.log(`   npx tsx scripts/enrichFromFirestoreNBA.ts --season=${season}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const SEASON     = 2024; // collection name
    const BDL_SEASON = 2024; // BDL season param (same year = same convention ✓)L uses starting year: 2024 = 2024-25 season

  console.log(`\n🏀 NBA Historical Backfill`);
  console.log(`   Collection: nbaProps_${SEASON}`);
  console.log(`   BDL season: ${BDL_SEASON} (${BDL_SEASON}-${String(BDL_SEASON + 1).slice(2)} season)`);
  console.log(`   Dry run:    ${DRY}`);
  console.log(`   Player:     ${SINGLE_PLAYER || 'all'}`);
  console.log('='.repeat(55));

  if (!BDL_API_KEY) {
    console.error('❌ BALLDONTLIE_API_KEY not set — cannot fetch historical stats');
    process.exit(1);
  }

  if (!ENRICH_ONLY) {
    // ── Phase 1: Fetch + write box scores ──────────────────────────────────
    console.log('\n📡 Phase 1: Loading player ID maps...');
    const { players } = await loadIdMaps();
    console.log(`   ${players.length} players to process`);

    console.log('\n🏀 Loading NBA teams...');
    await loadTeams();
    await sleep(1000);

    let totalWritten = 0;

    for (const player of players) {
      console.log(`\n  👤 ${player.player} (bdlId=${player.bdlId})`);

      const stats = await fetchBDLSeasonStats(player.bdlId, BDL_SEASON);
      console.log(`     ${stats.length} games found`);

      if (stats.length === 0) {
        console.log(`     ⚠️  No stats — player may not have played in ${BDL_SEASON}-${String(BDL_SEASON + 1).slice(2)}`);
        continue;
      }

      const written = await writePropsForPlayer(player, stats, SEASON);
      totalWritten += written;
      console.log(`     ✅ ${written} prop records ${DRY ? '(dry run)' : 'written'}`);

      await sleep(500); // rate limit buffer between players
    }

    console.log(`\n✅ Phase 1 complete: ${totalWritten} total prop records ${DRY ? 'would be written' : 'written'}`);
  }

  if (!DRY) {
    await triggerEnrichment(SEASON);
  }

  console.log('\n📋 Next steps:');
  console.log('  1. Run the enrich command above to fill playerAvg, hitPct, confidence');
  console.log('  2. Historical game results (gameStat) are already populated from BDL');
  console.log('  3. actualResult (hit/miss) requires a line — add lines via manual entry or Odds API backfill');
  console.log('');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });