#!/usr/bin/env tsx
// scripts/postGame.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    initializeApp({ credential: cert(keyPath) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
  } else {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

import { getPropsForWeek, updateProps, getPfrIdMap, movePropsToAllProps } from '@/lib/enrichment/firestore';
import { fetchSeasonLog, getPfrId, getStatFromGame } from '@/lib/enrichment/pfr';
import { normalizeProp, splitComboProp } from '@/lib/enrichment/normalize';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/scoring';
import type { NFLProp } from '@/lib/types';
import type { PFRGame } from '@/lib/enrichment/types';

async function main() {
  const weekArg   = process.argv.find((a: string) => a.startsWith('--week='))?.split('=')[1]   ?? process.env.WEEK;
  const seasonArg = process.argv.find((a: string) => a.startsWith('--season='))?.split('=')[1] ?? process.env.SEASON ?? '2025';

  if (!weekArg) { console.error('Usage: tsx scripts/postGame.ts --week=14'); process.exit(1); }

  const week   = parseInt(weekArg, 10);
  const season = parseInt(seasonArg, 10);
  if (isNaN(week) || isNaN(season)) { console.error('Invalid week or season'); process.exit(1); }

  console.log(`\n🏆 Post-Game Processing — Week ${week}, Season ${season}`);
  console.log('='.repeat(50));

  const pfrSeason = week <= 3 ? season - 1 : season;

  const [props, pfrIdMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
  ]);

  console.log(`📋 ${props.length} props to process`);
  if (!props.length) { console.log('Nothing to do.'); process.exit(0); }

  // ── Prefetch PFR logs ──────────────────────────────────────────────────────
  const pfrCache = new Map<string, PFRGame[]>();

  async function getLogs(playerName: string): Promise<PFRGame[]> {
    if (pfrCache.has(playerName)) return pfrCache.get(playerName)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(playerName, []); return []; }
    const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
    pfrCache.set(playerName, logs);
    return logs;
  }

  // Filter to props with a player name, prefetch all in parallel
  const validProps = props.filter((p): p is NFLProp & { id: string; player: string } =>
    !!p.id && !!p.player
  );

  const playerSet = new Set(validProps.map(p => p.player));
  console.log(`Fetching PFR data for ${playerSet.size} unique players...`);
  await Promise.all(Array.from(playerSet).map(player => getLogs(player)));

  // ── Pass 1: Standard props ─────────────────────────────────────────────────
  const gameStatMap = new Map<string, number>();
  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];

  for (const prop of validProps) {
    const propNorm = normalizeProp(prop.prop ?? '');
    if (propNorm.includes('+')) continue;

    const logs = await getLogs(prop.player);
    const game = logs.find((g: PFRGame) => g.week === week);
    if (!game) { console.warn(`⚠️  No game: ${prop.player} Week ${week}`); continue; }

    const stat = getStatFromGame(game, propNorm);
    if (stat === null) continue;

    gameStatMap.set(`${prop.player}||${propNorm}`, stat);

    const update: Partial<NFLProp> = { gameStat: stat };

    if (prop.overUnder) {
      const result = determineResult(stat, prop.line ?? 0, prop.overUnder);
      update.actualResult = result;
      if (prop.betAmount != null && prop.bestOdds != null) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season, week, data: update });
  }

  console.log(`✅ Pass 1 (standard): ${updates.length} props`);

  // ── Pass 2: Combo props ────────────────────────────────────────────────────
  let comboCount = 0;

  for (const prop of validProps) {
    const propNorm = normalizeProp(prop.prop ?? '');
    if (!propNorm.includes('+')) continue;

    const components = splitComboProp(propNorm);
    if (!components) continue;

    const stats = components.map((c: string) => gameStatMap.get(`${prop.player}||${c}`));
    if (stats.some((s) => s === undefined)) continue;

    const combinedStat = Math.round(
      (stats as number[]).reduce((acc, val) => acc + val, 0) * 10
    ) / 10;

    const update: Partial<NFLProp> = { gameStat: combinedStat };

    if (prop.overUnder) {
      const result = determineResult(combinedStat, prop.line ?? 0, prop.overUnder);
      update.actualResult = result;
      if (prop.betAmount != null && prop.bestOdds != null) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season, week, data: update });
    comboCount++;
  }

  console.log(`✅ Pass 2 (combos): ${comboCount} props`);

  if (updates.length > 0) {
    await updateProps(updates);
    console.log(`✅ Results written to weeklyProps_${season}/${week}`);
  }

  // ── Move to allProps_{season} ──────────────────────────────────────────────
  console.log(`\n📦 Moving to allProps_${season}...`);
  const { moved, skipped } = await movePropsToAllProps(season, week);

  // ── Summary ───────────────────────────────────────────────────────────────
  const wins   = updates.filter(u => u.data.actualResult === 'won').length;
  const losses = updates.filter(u => u.data.actualResult === 'lost').length;
  const pushes = updates.filter(u => u.data.actualResult === 'push').length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done`);
  console.log(`   📊 W: ${wins} | L: ${losses} | P: ${pushes}`);
  console.log(`   📦 Moved: ${moved} → allProps_${season} | Skipped: ${skipped} duplicates`);
  console.log(`   🗑️  weeklyProps_${season}/${week} cleared`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });