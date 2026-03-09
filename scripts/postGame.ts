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
import type { NFLProp, PropResult } from '@/lib/types';
import type { PFRGame } from '@/lib/enrichment/types';

async function main() {
  const weekArg   = process.argv.find((a: string) => a.startsWith('--week='))?.split('=')[1]   ?? process.env.WEEK;
  const seasonArg = process.argv.find((a: string) => a.startsWith('--season='))?.split('=')[1] ?? process.env.SEASON ?? '2025';

  if (!weekArg) { 
    console.error('Usage: tsx scripts/postGame.ts --week=14'); 
    process.exit(1); 
  }

  const week   = parseInt(weekArg, 10);
  const season = parseInt(seasonArg, 10);
  
  if (isNaN(week) || isNaN(season)) { 
    console.error('Invalid week or season'); 
    process.exit(1); 
  }

  console.log(`\n🏆 Post-Game Processing — Week ${week}, Season ${season}`);
  console.log('='.repeat(50));

  const pfrSeason = week <= 3 ? season - 1 : season;

  const [props, pfrIdMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
  ]);

  console.log(`📋 ${props.length} props to process`);
  if (!props.length) { 
    console.log('Nothing to do.'); 
    process.exit(0); 
  }

  const pfrCache = new Map<string, PFRGame[]>();

  async function getLogs(playerName: string): Promise<PFRGame[]> {
    if (pfrCache.has(playerName)) return pfrCache.get(playerName)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { 
      pfrCache.set(playerName, []); 
      return []; 
    }
    const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
    pfrCache.set(playerName, logs);
    return logs;
  }

  const validProps = props.filter((p): p is NFLProp & { id: string; player: string } =>
    !!p.id && !!p.player && p.actualResult === 'pending' // only process pending props
  );

  const playerSet = new Set(validProps.map(p => p.player));
  console.log(`Fetching PFR data for ${playerSet.size} unique players...`);
  await Promise.all(Array.from(playerSet).map(player => getLogs(player)));

  const gameStatMap = new Map<string, number>();
  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];

  // ── PASS 1: Standard Props ────────────────────────────────────────────────
  for (const prop of validProps) {
    const propNorm = normalizeProp(prop.prop ?? '');
    if (propNorm.includes('+')) continue;

    const logs = await getLogs(prop.player);
    const game = logs.find((g: PFRGame) => Number(g.week) === week);
    
    if (!game) { 
      console.warn(`⚠️  No game found for ${prop.player} in Week ${week}`); 
      continue; 
    }

    const stat = getStatFromGame(game, propNorm);
    if (stat === null) continue;

    gameStatMap.set(`${prop.player}||${propNorm}`, stat);

    const update: Partial<NFLProp> = { gameStat: stat };

    if (prop.overUnder && prop.line != null) {
      const result = determineResult(stat, prop.line, prop.overUnder);
      update.actualResult = result;
      
      if (prop.betAmount != null && prop.bestOdds != null) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season: season, week: week, data: update });
  }

  // ── PASS 2: Combo Props ───────────────────────────────────────────────────
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

    if (prop.overUnder && prop.line != null) {
      const result = determineResult(combinedStat, prop.line, prop.overUnder);
      update.actualResult = result;
      if (prop.betAmount != null && prop.bestOdds != null) {
        update.profitLoss = calculateProfitLoss(result, prop.betAmount, prop.bestOdds);
      }
    }

    updates.push({ id: prop.id, season: season, week: week, data: update });
  }

  if (updates.length > 0) {
    await updateProps(updates);
    console.log(`✅ Results written for ${updates.length} props`);
  }

  // ── Finalization: Move to Archive ─────────────────────────────────────────
  console.log(`\n📦 Archiving to allProps_${season}...`);
  const { moved, skipped } = await movePropsToAllProps(season, week);

  const wins   = updates.filter(u => u.data.actualResult === 'won').length;
  const losses = updates.filter(u => u.data.actualResult === 'lost').length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ DONE`);
  console.log(`📊 Record: ${wins}W - ${losses}L`);
  console.log(`📦 Archive: ${moved} moved | ${skipped} skipped`);
}

main().catch(err => { 
  console.error('❌ Error during post-game processing:', err); 
  process.exit(1); 
});
