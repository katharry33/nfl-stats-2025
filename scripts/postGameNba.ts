#!/usr/bin/env tsx
// scripts/postGameNBA.ts
//
// Usage:
//   npx tsx scripts/postGameNBA.ts --date=YYYY-MM-DD [--season=<n>] [--force]
//
// Fetches actual box-score stats from BallDontLie for all pending NBA props
// on a given date, writes gameStat + actualResult, and optionally P&L.
// Mirrors postGame.ts exactly — BallDontLie replaces PFR as the stat source.

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { normalizeNBAProp, splitNBACombo } from '@/lib/enrichment/nba/normalize-nba';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { BRGame } from '@/lib/enrichment/types';

// ─── BallDontLie config ───────────────────────────────────────────────────────
const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_API_KEY  = process.env.BDL_API_KEY ?? process.env.BDL_API_KEY ?? '';
if (!BDL_API_KEY) console.warn('⚠️  BALLDONTLIE_API_KEY not set — BDL requests will likely 401');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const DATE   = args.find(a => a.startsWith('--date='))?.split('=')[1] ?? '';
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const FORCE  = args.includes('--force');
const COLL   = `nbaProps_${SEASON}`;

if (!DATE || !/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error('Usage: postGameNBA.ts --date=YYYY-MM-DD [--season=<n>] [--force]');
  process.exit(1);
}

// ─── BallDontLie: fetch all stats for a given date ───────────────────────────

interface BDLStatRow {
  playerId: number;
  // All counting stats we care about
  pts:      number;
  ast:      number;
  reb:      number;
  stl:      number;
  blk:      number;
  fg3m:     number;
  tov:      number;
  min:      string; // "35:22" or "0" for DNP
}

async function fetchBDLStatsForDate(date: string): Promise<Map<number, BDLStatRow>> {
  const map = new Map<number, BDLStatRow>();
  let cursor: number | null = null;

  // BDL paginates — walk all pages
  do {
    const params = new URLSearchParams({
      'dates[]': date,
      per_page:  '100',
    });
    if (cursor != null) params.set('cursor', String(cursor));

    const res = await fetch(`${BDL_BASE}/stats?${params}`, {
      headers: { Authorization: BDL_API_KEY },
    });

    if (!res.ok) {
      console.error(`❌ BDL stats fetch failed: HTTP ${res.status}`);
      break;
    }

    const json = await res.json();

    for (const s of json.data ?? []) {
      // Skip DNP rows — BDL returns them with min "0" or ""
      const minStr = String(s.min ?? '').trim();
      if (!minStr || minStr === '0' || minStr.startsWith('0:')) continue;

      map.set(s.player.id, {
        playerId: s.player.id,
        pts:      s.pts      ?? 0,
        ast:      s.ast      ?? 0,
        reb:      s.reb      ?? 0,
        stl:      s.stl      ?? 0,
        blk:      s.blk      ?? 0,
        fg3m:     s.fg3m     ?? 0,
        tov:      s.turnover ?? 0,
        min:      minStr,
      });
    }

    cursor = json.meta?.next_cursor ?? null;
  } while (cursor != null);

  return map;
}

// ─── Adapt BDLStatRow to BRGame shape for getNBAStatFromGame ─────────────────
// getNBAStatFromGame expects a BRGame. We only populate the fields it reads,
// so the rest can be zero. This avoids duplicating the stat-extraction logic.

function bdlRowToBRGame(row: BDLStatRow): BRGame {
  return {
    gameNum: 0,
    date:    '',
    pts:     row.pts,
    ast:     row.ast,
    reb:     row.reb,
    orb:     0,
    drb:     0,
    stl:     row.stl,
    blk:     row.blk,
    tov:     row.tov,
    fg3m:    row.fg3m,
    fg3a:    0,
    fgm:     0,
    fga:     0,
    ftm:     0,
    fta:     0,
    mp:      row.min,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏀 NBA Post-Game Processing — ${DATE} (season ${SEASON})`);
  console.log(`📦 Collection: ${COLL}  |  force=${FORCE}`);
  console.log('='.repeat(55));

  // 1. Load all props for this date
  const snapshot = await db.collection(COLL)
    .where('gameDate', '==', DATE)
    .get();

  console.log(`📋 Found ${snapshot.size} props for ${DATE}`);
  if (snapshot.empty) { console.log('Nothing to do.'); return; }

  // 2. Normalise docs
  interface PropRow {
    id:               string;
    player:           string;
    prop:             string;
    propNorm:         string;
    line:             number;
    overUnder:        string;
    bdlId:            number | null;
    betAmount:        number | null;
    bestOdds:         number | null;
    playerAvg:        number | null;
    existingGameStat: number | null;
    actualResult:     string | null;
  }

  const props: PropRow[] = snapshot.docs.map(d => {
    const r = d.data();
    return {
      id:               d.id,
      player:           r.player      ?? '',
      prop:             r.prop        ?? '',
      propNorm:         normalizeNBAProp(r.prop ?? ''),
      line:             Number(r.line ?? 0),
      overUnder:        r.overUnder   ?? 'Over',
      bdlId:            r.bdlId       ?? null,
      betAmount:        r.betAmount   ?? null,
      bestOdds:         r.bestOdds    ?? null,
      playerAvg:        r.playerAvg   ?? null,
      existingGameStat: r.gameStat    ?? null,
      actualResult:     r.actualResult ?? null,
    };
  });

  // Skip already-graded unless --force
  const toGrade = FORCE
    ? props
    : props.filter(p => p.actualResult == null);

  console.log(`🎯 ${toGrade.length} props to grade (${props.length - toGrade.length} already done)`);
  if (toGrade.length === 0) { console.log('Nothing to do.'); return; }

  // 3. Fetch BDL stats once for all players on this date
  console.log('\n📡 Fetching BallDontLie box scores…');
  const bdlStats = await fetchBDLStatsForDate(DATE);
  console.log(`✅ ${bdlStats.size} player stat rows returned by BDL`);

  // 4. Build a bdlId → BRGame map for quick lookup
  const gameMap = new Map<number, BRGame>();
  for (const [bdlId, row] of bdlStats) {
    gameMap.set(bdlId, bdlRowToBRGame(row));
  }

  // 5. Grade each prop
  const updates: Array<{ id: string; data: Record<string, any> }> = [];
  let noId = 0, noStat = 0, graded = 0;

  for (const prop of toGrade) {
    if (!prop.id || !prop.player) continue;

    // Combo props — derive stat by summing components
    // getNBAStatFromGame handles combo propNorms via splitNBACombo internally
    if (!prop.bdlId) {
      noId++;
      console.log(`  ⚠️  No bdlId for "${prop.player}" — cannot grade ${prop.propNorm}`);
      continue;
    }

    const game = gameMap.get(prop.bdlId);
    if (!game) {
      noStat++;
      console.log(`  ⚠️  No BDL stat row for ${prop.player} (bdlId=${prop.bdlId}) — DNP or data gap`);
      continue;
    }

    const stat = getNBAStatFromGame(game, prop.propNorm);
    if (stat === null) {
      noStat++;
      console.log(`  ⚠️  getNBAStatFromGame returned null for ${prop.player} ${prop.propNorm}`);
      continue;
    }

    const result = determineResult(stat, prop.line, prop.overUnder as 'Over' | 'Under');

    const update: Record<string, any> = {
      gameStat:     stat,
      actualResult: result.toLowerCase(), // 'won' / 'lost'
      gradedAt:     new Date().toISOString(),
      // scoreDiff: player season avg vs line — pre-game signal stored for analytics
      ...(prop.playerAvg != null
        ? { scoreDiff: Math.round((Number(prop.playerAvg) - prop.line) * 10) / 10 }
        : {}),
    };

    // P&L if we have stake + odds
    if (prop.betAmount && prop.bestOdds) {
      update.profitLoss = calculateProfitLoss(prop.betAmount, prop.bestOdds, result);
    }

    updates.push({ id: prop.id, data: update });
    graded++;

    console.log(
      `  ${result === 'Won' ? '✅' : '❌'} ${prop.player.padEnd(22)} ` +
      `${prop.propNorm.padEnd(16)} ` +
      `actual=${String(stat).padStart(5)}  line=${String(prop.line).padStart(5)}  ${result}`,
    );
  }

  // 6. Batch write
  if (updates.length === 0) {
    console.log('\nNo updates to write.');
    return;
  }

  console.log(`\n💾 Writing ${updates.length} results…`);
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(db.collection(COLL).doc(id), data);
    }
    await batch.commit();
    console.log(`   Committed ${Math.min(i + 400, updates.length)} / ${updates.length}`);
  }

  console.log(`
📊 Summary:
   Graded:       ${graded}
   No bdlId:     ${noId}
   No stat row:  ${noStat}
   Total props:  ${props.length}
✅ Done.`);
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });