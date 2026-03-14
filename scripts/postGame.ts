#!/usr/bin/env tsx
// scripts/postGame.ts
// Usage:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/postGame.ts --week=1 --all
//   npx dotenv-cli -e .env.local -- npx tsx scripts/postGame.ts --week=1

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getPfrIdMap } from '@/lib/enrichment/firestore';
import { fetchSeasonLog, getPfrId, getStatFromGame } from '@/lib/enrichment/pfr';
import { normalizeProp, splitComboProp } from '@/lib/enrichment/normalize';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/scoring';
import type { PFRGame } from '@/lib/enrichment/types';

interface PropRow {
  id:               string;
  player:           string;
  prop:             string;
  line:             number;
  overUnder:        string;
  betAmount:        number | null;
  bestOdds:         number | null;
  week:             number | null;
  season:           number | null;
  existingGameStat: number | null;
}

const args    = process.argv.slice(2);
const WEEK    = parseInt(args.find(a => a.startsWith('--week='))?.split('=')[1] ?? '', 10);
const SEASON  = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const USE_ALL = args.includes('--all');
const COLL    = USE_ALL ? `allProps_${SEASON}` : `weeklyProps_${SEASON}`;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Infer over/under from prop string if not stored in the doc.
 * Most props in this dataset are "Under" plays (low lines for bench players)
 * but the actual direction should come from the data. Default to 'Over' 
 * as the standard bet direction when unknown.
 */
function inferOverUnder(raw: string): 'Over' | 'Under' {
  const s = raw.toLowerCase();
  if (s.includes('under') || s.includes(' u ') || s.endsWith(' u')) return 'Under';
  if (s.includes('over')  || s.includes(' o ') || s.endsWith(' o')) return 'Over';
  return 'Over'; // default
}

if (isNaN(WEEK)) {
  console.error('Usage: postGame.ts --week=<n> [--season=<n>] [--all]');
  process.exit(1);
}

async function main() {
  console.log(`\n🏆 Post-Game Processing — Week ${WEEK}, Season ${SEASON}`);
  console.log(`📦 Collection: ${COLL}`);
  console.log('='.repeat(50));

  let snapshot = await db.collection(COLL).where('week', '==', WEEK).get();
  if (snapshot.empty) snapshot = await db.collection(COLL).where('Week', '==', WEEK).get();

  console.log(`📋 Found ${snapshot.size} props in ${COLL} week ${WEEK}`);
  if (snapshot.empty) { console.log('Nothing to do.'); return; }

  const props: PropRow[] = snapshot.docs.map(d => {
    const r    = d.data() as Record<string, any>;
    const pick = (...keys: string[]) => {
      for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; }
      return null;
    };

    // Over/Under: exhaustive field name list covering Sheets imports, manual entries, enriched docs
    const rawOU = pick('Over/Under?', 'Over/Under', 'overUnder', 'over under', 'overunder', 'Over Under');
    const rawProp = pick('Prop', 'prop') ?? '';
    const overUnder = rawOU ?? inferOverUnder(rawProp);

    // Existing game stat: check both new (gameStat) and old Sheets format (game stats)
    const existingGameStat = pick('gameStat', 'game stats', 'Game Stats');

    return {
      id:               d.id,
      player:           pick('Player', 'player')                       ?? '',
      prop:             rawProp,
      line:             pick('Line', 'line')                           ?? 0,
      overUnder,
      betAmount:        pick('Bet Amount', 'betAmount'),
      bestOdds:         pick('Best Odds', 'bestOdds'),
      week:             pick('Week', 'week'),
      season:           pick('Season', 'season'),
      existingGameStat: typeof existingGameStat === 'number' ? existingGameStat : null,
    };
  });

  console.log(`📋 ${props.length} props to process`);
  const missingOU = props.filter(p => !p.overUnder).length;
  if (missingOU > 0) console.log(`⚠️  ${missingOU} props had no over/under (inferred from prop string)`);

  const pfrIdMap = await getPfrIdMap();
  const pfrCache = new Map<string, PFRGame[]>();

  // Only fetch PFR for players missing a game stat
  const needsFetch = new Set(
    props
      .filter(p => p.existingGameStat === null)
      .map(p => p.player)
      .filter(Boolean)
  );
  const alreadyHaveStat = props.length - props.filter(p => p.existingGameStat === null).length;
  console.log(`\n${alreadyHaveStat} props already have game stat, fetching PFR for ${needsFetch.size} players...`);

  for (const playerName of Array.from(needsFetch)) {
    if (pfrCache.has(playerName)) continue;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) {
      console.warn(`⚠️  No PFR ID: ${playerName}`);
      pfrCache.set(playerName, []);
      continue;
    }
    const logs = await fetchSeasonLog(playerName, pfrId, SEASON);
    pfrCache.set(playerName, logs);
    await sleep(2000);
  }

  const getLogs = (name: string): PFRGame[] => pfrCache.get(name) ?? [];

  const gameStatMap = new Map<string, number>();
  const updates: Array<{ id: string; data: Record<string, any> }> = [];

  // Pass 1: standard props
  for (const prop of props) {
    if (!prop.id || !prop.player) continue;
    const propNorm = normalizeProp(prop.prop);
    if (propNorm.includes('+')) continue;

    const logs = getLogs(prop.player);
    const game = logs.find(g => g.week === WEEK);

    // Use PFR game data if available, fall back to existingGameStat (e.g. old Sheets import)
    let stat: number | null = null;
    if (game) {
      stat = getStatFromGame(game, propNorm);
      if (stat === null) console.warn(`⚠️  Unknown stat: ${prop.player} propNorm="${propNorm}"`);
    } else if (prop.existingGameStat !== null) {
      stat = prop.existingGameStat;
      console.log(`ℹ️  Using stored game stat for ${prop.player} Week ${WEEK}: ${stat}`);
    } else {
      console.warn(`⚠️  No game data: ${prop.player} Week ${WEEK} (${logs.length} games, norm="${propNorm}")`);
    }

    if (stat === null) continue;

    gameStatMap.set(`${prop.player}||${propNorm}`, stat);

    const update: Record<string, any> = { gameStat: stat };

    // Always write result when we have a game stat — 0 is valid
    const result = determineResult(stat, prop.line, prop.overUnder);
    update.actualResult = result;
    // Also persist the inferred overUnder so future reads have it
    if (!prop.overUnder) update.overUnder = inferOverUnder(prop.prop);
    if (prop.betAmount && prop.bestOdds) {
      update.profitLoss = calculateProfitLoss(prop.betAmount, prop.bestOdds, result);
    }

    updates.push({ id: prop.id, data: update });
  }
  console.log(`✅ Pass 1 (standard): ${updates.length} props`);

  // Pass 2: combo props
  let comboCount = 0;
  for (const prop of props) {
    if (!prop.id || !prop.player) continue;
    const propNorm   = normalizeProp(prop.prop);
    if (!propNorm.includes('+')) continue;

    const components = splitComboProp(propNorm);
    if (!components) continue;

    const stats = components.map(c => gameStatMap.get(`${prop.player}||${c}`));
    if (stats.some(s => s === undefined)) continue;

    const combinedStat = Math.round((stats as number[]).reduce((a, v) => a + v, 0) * 10) / 10;
    const update: Record<string, any> = { gameStat: combinedStat };
    const result = determineResult(combinedStat, prop.line, prop.overUnder);
    update.actualResult = result;
    if (!prop.overUnder) update.overUnder = inferOverUnder(prop.prop);
    if (prop.betAmount && prop.bestOdds) {
      update.profitLoss = calculateProfitLoss(prop.betAmount, prop.bestOdds, result);
    }
    updates.push({ id: prop.id, data: update });
    comboCount++;
  }
  console.log(`✅ Pass 2 (combos): ${comboCount} props`);

  if (!updates.length) { console.log('No updates to write.'); return; }

  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.set(db.collection(COLL).doc(id), data, { merge: true });
    }
    await batch.commit();
  }

  const wins   = updates.filter(u => u.data.actualResult === 'won').length;
  const losses = updates.filter(u => u.data.actualResult === 'lost').length;
  const pushes = updates.filter(u => u.data.actualResult === 'push').length;
  const noOU   = updates.filter(u => !u.data.actualResult).length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${updates.length} props updated`);
  console.log(`   📊 W: ${wins} | L: ${losses} | P: ${pushes} | No result: ${noOU}`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });