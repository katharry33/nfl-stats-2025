#!/usr/bin/env tsx
// scripts/postGame.ts
//
// Usage:
//   npx tsx scripts/postGame.ts --week=<n> [--season=<n>] [--all]
//
// --all   targets allProps_{season}; default is weeklyProps_{season}

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getPfrIdMap } from '@/lib/enrichment/firestore';
import { fetchSeasonLog, getPfrId, getStatFromGame } from '@/lib/enrichment/nfl/pfr';
import { normalizeProp, splitComboProp } from '@/lib/enrichment/shared/normalize';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { PFRGame } from '@/lib/enrichment/types';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Legacy field names to delete on touch ───────────────────────────────────
// Any document we update gets these stale keys removed silently.
const LEGACY_KEYS = [
  'Score Diff', 'Season Hit %', 'actual stats', 'Actual stats',
  'game stats', 'Game Stats', 'Actual Stats',
];

// ─── CLI args ────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const WEEK   = parseInt(args.find(a => a.startsWith('--week='))?.split('=')[1]   ?? '', 10);
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const USE_ALL = args.includes('--all');
const COLL    = USE_ALL ? `allProps_${SEASON}` : `weeklyProps_${SEASON}`;

if (isNaN(WEEK)) {
  console.error('Usage: postGame.ts --week=<n> [--season=<n>] [--all]');
  process.exit(1);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏆 Post-Game Processing — Week ${WEEK}, Season ${SEASON}`);
  console.log(`📦 Collection: ${COLL}`);
  console.log('='.repeat(50));

  const snapshot = await db.collection(COLL).where('week', '==', WEEK).get();
  console.log(`📋 Found ${snapshot.size} props`);
  if (snapshot.empty) { console.log('Nothing to do.'); return; }

  // ── Normalise docs ────────────────────────────────────────────────────────
  interface PropRow {
    id:               string;
    player:           string;
    prop:             string;
    line:             number;
    overUnder:        'Over' | 'Under';
    betAmount:        number | null;
    bestOdds:         number | null;
    playerAvg:        number | null;
    week:             number;
    season:           number;
    existingGameStat: number | null;
    rawDoc:           Record<string, any>;
  }

  const props: PropRow[] = snapshot.docs.map(d => {
    const r = d.data();
    return {
      id:               d.id,
      player:           r.player     ?? r.Player    ?? '',
      prop:             r.prop       ?? r.Prop       ?? '',
      line:             r.line       ?? r.Line       ?? 0,
      overUnder:        r.overUnder  ?? r['Over/Under?'] ?? r['over under'] ?? 'Over',
      betAmount:        r.betAmount  ?? r['Bet Amount']  ?? null,
      bestOdds:         r.bestOdds   ?? r['Best Odds']   ?? null,
      playerAvg:        r.playerAvg  ?? r['Player Avg']  ?? null,
      week:             r.week       ?? r.Week            ?? WEEK,
      season:           r.season     ?? r.Season          ?? SEASON,
      existingGameStat: r.gameStat   ?? r['game stats']   ?? null,
      rawDoc:           r,
    };
  });

  // ── Fetch PFR logs ────────────────────────────────────────────────────────
  const pfrIdMap = await getPfrIdMap();
  const pfrCache = new Map<string, PFRGame[]>();

  const needsFetch = new Set(
    props
      .filter(p => p.existingGameStat === null && !normalizeProp(p.prop).includes('+'))
      .map(p => p.player)
      .filter(Boolean),
  );

  console.log(`\nFetching PFR logs for ${needsFetch.size} players…`);

  for (const playerName of needsFetch) {
    if (pfrCache.has(playerName)) continue;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(playerName, []); continue; }
    const logs = await fetchSeasonLog(playerName, pfrId, SEASON);
    pfrCache.set(playerName, logs);
    await sleep(2000); // respect PFR rate limits
  }

  // ── Score each prop ───────────────────────────────────────────────────────
  const updates: Array<{ id: string; data: Record<string, any> }> = [];

  for (const prop of props) {
    if (!prop.id || !prop.player) continue;

    const propNorm = normalizeProp(prop.prop);

    // Skip combo props — they don't map 1:1 to a PFR game stat
    if (propNorm.includes('+')) continue;

    // Prefer cached PFR stat; fall back to existing stored value
    const game = pfrCache.get(prop.player)?.find(g => g.week === WEEK);
    const stat: number | null = game
      ? getStatFromGame(game, propNorm)
      : prop.existingGameStat;

    if (stat === null) continue;

    const result = determineResult(stat, prop.line, prop.overUnder);

    const update: Record<string, any> = {
      // Canonical game-result fields
      gameStat:     stat,
      actualResult: result.toLowerCase(), // always stored lowercase: 'won' / 'lost'

      // ── scoreDiff: player's season average vs the line ────────────────────
      // Formula: playerAvg − line  (positive = player trends over, negative = under)
      // This is a pre-game signal stored alongside post-game results for analysis.
      ...(prop.playerAvg != null
        ? { scoreDiff: Math.round((Number(prop.playerAvg) - prop.line) * 10) / 10 }
        : {}),
    };

    // P&L if we have stake + odds
    if (prop.betAmount && prop.bestOdds) {
      update.profitLoss = calculateProfitLoss(prop.betAmount, prop.bestOdds, result);
    }

    // Silently delete any legacy field names on this document
    for (const legacyKey of LEGACY_KEYS) {
      if (prop.rawDoc[legacyKey] !== undefined) {
        update[legacyKey] = FieldValue.delete();
      }
    }

    updates.push({ id: prop.id, data: update });
  }

  // ── Batch write ───────────────────────────────────────────────────────────
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(db.collection(COLL).doc(id), data);
    }
    await batch.commit();
    console.log(`  💾 Committed ${Math.min(i + 400, updates.length)} / ${updates.length}`);
  }

  console.log(`\n✅ Done: ${updates.length} props scored, scoreDiff computed, legacy keys cleaned.`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });