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

import { getPropsForWeek, updateProps, getPfrIdMap } from './firestore';
import { fetchSeasonLog, getPfrId, getStatFromGame } from './pfr';
import { normalizeProp, splitComboProp } from './normalize';
import { determineResult, calculateProfitLoss } from './scoring';
import type { NFLProp, PFRGame } from './types';

const SEASON = 2025;

async function main() {
  const weekArg = process.argv.find((a: string) => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
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

  const pfrCache = new Map<string, PFRGame[]>();

  async function getLogs(playerName: string): Promise<PFRGame[]> {
    if (pfrCache.has(playerName)) return pfrCache.get(playerName)!;
    const pfrId = await getPfrId(String(playerName), pfrIdMap);
    if (!pfrId) { pfrCache.set(playerName, []); return []; }
    const logs = await fetchSeasonLog(playerName, pfrId, SEASON);
    pfrCache.set(playerName, logs);
    return logs;
  }

  const playerSet = new Set(props.map((p: NFLProp) => p.player));
  console.log(`Fetching data for ${playerSet.size} unique players...`);
  await Promise.all(Array.from(playerSet).map((player: string) => getLogs(player)));

  const gameStatMap = new Map<string, number>();
  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];

  for (const prop of props as NFLProp[]) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop);
    if (propNorm.includes('+')) continue;

    const logs = await getLogs(prop.player);
    const game = logs.find((g: PFRGame) => g.week === week);
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

  let comboCount = 0;
  for (const prop of props as NFLProp[]) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop);
    if (!propNorm.includes('+')) continue;

    const components = splitComboProp(propNorm);
    if (!components) continue;

    const stats = components.map((c: string) => gameStatMap.get(`${prop.player}||${c}`));
    if (stats.some((s: number | undefined) => s === undefined)) continue;

    const validStats = stats as number[];
    const combinedStat = Math.round(validStats.reduce((acc: number, val: number) => acc + val, 0) * 10) / 10;
    
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

  if (updates.length > 0) await updateProps(updates);

  const wins   = updates.filter((u: any) => u.data.actualResult === 'Win').length;
  const losses = updates.filter((u: any) => u.data.actualResult === 'Loss').length;
  const pushes = updates.filter((u: any) => u.data.actualResult === 'Push').length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${updates.length} props updated`);
  console.log(`   📊 W: ${wins} | L: ${losses} | P: ${pushes}`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
