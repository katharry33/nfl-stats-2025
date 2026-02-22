#!/usr/bin/env tsx
// scripts/postGame.ts
// Loads game stats from PFR and calculates Win/Loss/Push for each prop
//
// Usage:
//   tsx scripts/postGame.ts --week=14

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

import { getPropsForWeek, updateProps, getPfrIdMap } from '@/lib/enrichment/firestore';
import { fetchSeasonLog, getPfrId, getStatFromGame } from '@/lib/enrichment/pfr';
import { normalizeProp, splitComboProp } from '@/lib/enrichment/normalize';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/scoring';
import type { NFLProp } from '@/lib/enrichment/types';

const SEASON = 2025;

async function main() {
  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
  if (!weekArg) { console.error('Usage: tsx scripts/postGame.ts --week=14'); process.exit(1); }

  const week = parseInt(weekArg, 10);
  if (isNaN(week)) { console.error('Invalid week number'); process.exit(1); }

  console.log(`\n🏆 Post-Game Processing — Week ${week}, Season ${SEASON}`);
  console.log('='.repeat(50));

  const [props, pfrIdMap] = await Promise.all([
    getPropsForWeek(SEASON, week),
    getPfrIdMap(),
  ]);

  console.log(`📋 ${props.length} props to process`);

  const pfrCache = new Map<string, Awaited<ReturnType<typeof fetchSeasonLog>>>();

  async function getLogs(playerName: string) {
    if (pfrCache.has(playerName)) return pfrCache.get(playerName)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(playerName, []); return []; }
    const logs = await fetchSeasonLog(playerName, pfrId, SEASON);
    pfrCache.set(playerName, logs);
    return logs;
  }

  // Track standard stats for combo calculation
  const gameStatMap = new Map<string, number>(); // "player||propNorm" → stat
  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];

  // Pass 1 — Standard props
  for (const prop of props) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop);
    if (propNorm.includes('+')) continue;

    const logs = await getLogs(prop.player);
    const game = logs.find(g => g.week === week);
    if (!game) { console.warn(`⚠️  No game: ${prop.player} Week ${week}`); continue; }

    const stat = getStatFromGame(game, propNorm);
    if (stat === null) continue;

    gameStatMap.set(`${prop.player}||${propNorm}`, stat);

    const update: Partial<NFLProp> = { gameStat: stat };

    if (prop.overUnder) {
      const result = determineResult(stat, prop.line, prop.overUnder);
      update.actualResult = result;
      if (prop.betAmount && prop.bestOdds) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season: SEASON, week, data: update });
  }

  console.log(`✅ Pass 1 (standard): ${updates.length} props`);

  // Pass 2 — Combo props
  let comboCount = 0;
  for (const prop of props) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop);
    if (!propNorm.includes('+')) continue;

    const components = splitComboProp(propNorm);
    if (!components) continue;

    const stats = components.map(c => gameStatMap.get(`${prop.player}||${c}`));
    if (stats.some(s => s === undefined)) continue;

    const combinedStat = Math.round(stats.reduce((s, v) => (s ?? 0) + (v ?? 0), 0)! * 10) / 10;
    const update: Partial<NFLProp> = { gameStat: combinedStat };

    if (prop.overUnder) {
      const result = determineResult(combinedStat, prop.line, prop.overUnder);
      update.actualResult = result;
      if (prop.betAmount && prop.bestOdds) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season: SEASON, week, data: update });
    comboCount++;
  }

  console.log(`✅ Pass 2 (combos): ${comboCount} props`);

  if (.length > 0) await updateProps(updates);

  const wins   = updates.filter(u => u.data.actualResult === 'Win').length;
  const losses = updates.filter(u => u.data.actualResult === 'Loss').length;
  const pushes = updates.filter(u => u.data.actualResult === 'Push').length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${updates.length} props updated`);
  console.log(`   📊 W: ${wins} | L: ${losses} | P: ${pushes}`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });