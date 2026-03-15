#!/usr/bin/env tsx
// scripts/enrichFromFirestore.ts
//
// Enriches allProps_{season} using ONLY static Firestore data — no PFR scraping.
// Fast, no rate limits. Fills: playerAvg, opponentRank, opponentAvgVsStat,
// overunder, scoreDiff, and all scoring fields (EV, Kelly, confidence, etc.)
//
// Usage:
//   npx tsx scripts/enrichFromFirestore.ts --season=2025
//   npx tsx scripts/enrichFromFirestore.ts --season=2024
//   npx tsx scripts/enrichFromFirestore.ts --season=2025 --week=18
//   npx tsx scripts/enrichFromFirestore.ts --season=2025 --force   # re-enrich all

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { normalizeProp, getOpponent } from '@/lib/enrichment/normalize';
import { computeScoring, pickBestOdds } from '@/lib/enrichment/scoring';

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const WEEK   = args.find(a => a.startsWith('--week='))?.split('=')[1];
const WEEK_N = WEEK ? parseInt(WEEK, 10) : undefined;
const FORCE  = args.includes('--force');

// ─── Static data loaders ──────────────────────────────────────────────────────

async function loadPlayerAvgs(season: number): Promise<Map<string, Record<string, number>>> {
  const snap = await db.collection('static_playerSeasonStats')
    .where('season', '==', season).get();
  const map = new Map<string, Record<string, number>>();
  for (const doc of snap.docs) {
    const r      = doc.data();
    const player = (r.player ?? '').toLowerCase().trim();
    const games  = Number(r.games ?? 0);
    if (!player || !games) continue;
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(r)) {
      if (['player','team','season','games','_updatedAt'].includes(k)) continue;
      stats[k] = Math.round((Number(v) / games) * 10) / 10;
    }
    map.set(player, stats);
  }
  console.log(`  📊 playerSeasonStats: ${map.size} players (season ${season})`);
  return map;
}

async function loadDefenseStats(season: number): Promise<Map<string, Record<string, number>>> {
  const snap = await db.collection('static_teamDefenseStats')
    .where('season', '==', season).get();
  const map = new Map<string, Record<string, number>>();
  for (const doc of snap.docs) {
    const r    = doc.data();
    const team = (r.team ?? '').toUpperCase().trim();
    if (!team) continue;
    map.set(team, r as Record<string, number>);
  }
  console.log(`  🛡️  teamDefenseStats:  ${map.size} teams (season ${season})`);
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Firestore-only enrichment — season=${SEASON}${WEEK_N ? ` week=${WEEK_N}` : ''} force=${FORCE}`);
  console.log('='.repeat(55));

  // Load all static data up front (3 Firestore reads total)
  console.log('\n📦 Loading static data…');
  const [playerAvgsCurrent, playerAvgsPrior, defCurrent, defPrior] = await Promise.all([
    loadPlayerAvgs(SEASON),
    loadPlayerAvgs(SEASON - 1),
    loadDefenseStats(SEASON),
    loadDefenseStats(SEASON - 1),
  ]);

  // Load allProps docs
  const colName = `allProps_${SEASON}`;
  console.log(`\n📋 Loading ${colName}…`);
  let docs = (await db.collection(colName).get()).docs;
  if (WEEK_N != null) docs = docs.filter(d => (d.data().week ?? d.data().Week) === WEEK_N);
  console.log(`   ${docs.length} docs${WEEK_N ? ` (week ${WEEK_N})` : ''}`);

  // ── Enrich ────────────────────────────────────────────────────────────────
  const updates: Array<{ id: string; data: Record<string, any> }> = [];
  let skipped = 0, noAvg = 0, noDef = 0, scored = 0;

  for (const doc of docs) {
    const r         = doc.data();
    const player    = (r.player ?? '').toLowerCase().trim();
    const propRaw   = r.prop ?? r.Prop ?? '';
    const propNorm  = normalizeProp(propRaw);
    const line      = Number(r.line ?? r.Line ?? 0);
    const week      = Number(r.week ?? r.Week ?? 1);
    const team      = (r.team ?? r.Team ?? '').toUpperCase().trim();
    const matchup   = r.matchup ?? r.Matchup ?? '';
    const fdOdds    = r.fdOdds ?? r.odds ?? null;
    const dkOdds    = r.dkOdds ?? null;
    const isEarly   = week <= 3;

    // Skip if already enriched and not forcing
    if (!FORCE && r.confidenceScore != null && r.confidenceScore !== 0) {
      skipped++; continue;
    }

    const update: Record<string, any> = {};

    // ── 1. Player average ─────────────────────────────────────────────────
    // Priority order:
    //   1. Existing value in Firestore (if valid/non-zero) — never overwrite good data
    //   2. static_playerSeasonStats (prior season for weeks 1-3, current otherwise)
    const existingAvg = (r.playerAvg != null && Number(r.playerAvg) !== 0)
      ? Number(r.playerAvg) : null;

    const statKey  = propNorm.replace(/ /g, '_');
    const avgMap   = isEarly ? playerAvgsPrior : playerAvgsCurrent;
    const fallback = isEarly ? playerAvgsCurrent : null;

    let staticAvg: number | null = avgMap.get(player)?.[statKey] ?? null;
    if (staticAvg == null && fallback) staticAvg = fallback.get(player)?.[statKey] ?? null;

    // Use existing if valid, then static, then give up
    let playerAvg: number | null = existingAvg ?? staticAvg ?? null;

    // Only write playerAvg if we're filling a gap (existing was null/zero)
    if (playerAvg != null && existingAvg == null) {
      update.playerAvg = playerAvg;
    } else if (existingAvg != null) {
      playerAvg = existingAvg; // use for scoring but don't re-write
    }

    if (playerAvg == null) noAvg++;

    // ── 2. overunder: derived from avg vs line ────────────────────────────
    const existingOU = r.overunder ?? r.overUnder ?? '';
    let resolvedOU: 'Over' | 'Under' | null = null;
    if (existingOU === 'Over' || existingOU === 'Under') {
      resolvedOU = existingOU;
    } else if (playerAvg != null) {
      resolvedOU = playerAvg > line ? 'Over' : 'Under';
      update.overunder = resolvedOU;
    }

    // ── 3. Defense stats ──────────────────────────────────────────────────
    const opponent  = team && matchup ? getOpponent(team, matchup) : null;
    const defSeason = isEarly ? SEASON - 1 : SEASON;
    const defMap    = isEarly ? defPrior : defCurrent;

    let opponentRank: number | null      = r.opponentRank      ?? null;
    let opponentAvg:  number | null      = r.opponentAvgVsStat ?? null;

    if ((opponentRank == null || FORCE) && opponent) {
      const defData = defMap.get(opponent.toUpperCase());
      if (defData) {
        const rank = defData[`${statKey}_rank`] ?? null;
        const avg  = defData[`${statKey}_avg`]  ?? null;
        if (rank != null && avg != null) {
          opponentRank      = Number(rank);
          opponentAvg       = Number(avg);
          update.opponentRank      = opponentRank;
          update.opponentAvgVsStat = opponentAvg;
        }
      }
    }

    if (opponentRank == null) noDef++;

    // ── 4. Score diff ─────────────────────────────────────────────────────
    const avg = update.playerAvg ?? r.playerAvg ?? null;
    if (avg != null) {
      update.scoreDiff = Math.round((Number(avg) - line) * 10) / 10;
    }

    // ── 5. Scoring (EV, Kelly, confidence, etc.) ──────────────────────────
    const pAvg = update.playerAvg ?? r.playerAvg ?? null;
    const oRnk = update.opponentRank      ?? r.opponentRank      ?? null;
    const oAvg = update.opponentAvgVsStat ?? r.opponentAvgVsStat ?? null;

    if (pAvg != null && oRnk != null && oAvg != null) {
      const best = pickBestOdds(fdOdds, dkOdds);
      const scoring = computeScoring({
        playerAvg:         Number(pAvg),
        opponentRank:      oRnk,
        opponentAvgVsStat: oAvg,
        line,
        seasonHitPct:      r.seasonHitPct ?? null,
        odds:              best.odds,
        propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
      scored++;
    }

    if (Object.keys(update).length > 0) updates.push({ id: doc.id, data: update });
  }

  console.log(`\n📊 Results:`);
  console.log(`   Total docs:      ${docs.length}`);
  console.log(`   Already done:    ${skipped}`);
  console.log(`   No playerAvg:    ${noAvg} (not in static_playerSeasonStats)`);
  console.log(`   No defense:      ${noDef}`);
  console.log(`   Scoring queued:  ${scored}`);
  console.log(`   Updates queued:  ${updates.length}`);

  if (updates.length === 0) { console.log('\n✅ Nothing to write.'); return; }

  // ── Batch write ───────────────────────────────────────────────────────────
  console.log(`\n💾 Writing ${updates.length} docs in batches…`);
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(db.collection(colName).doc(id), data);
    }
    await batch.commit();
    process.stdout.write(`\r   ${Math.min(i + 400, updates.length)} / ${updates.length}`);
  }

  console.log(`\n\n✅ Done — ${updates.length} props enriched.`);
  console.log('   Note: seasonHitPct requires PFR game logs (run separately when not rate-limited).');
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });