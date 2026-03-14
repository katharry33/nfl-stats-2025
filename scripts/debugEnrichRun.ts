#!/usr/bin/env tsx
// scripts/debugEnrichRun.ts — run enrichment on ONE prop and trace every step
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { normalizeProp, getOpponent } from '@/lib/enrichment/normalize';
import { getPfrId, fetchSeasonLog, calculateAvg, calculateHitPct } from '@/lib/enrichment/pfr';
import { getPfrIdMap, getPlayerSeasonAvg, getTeamDefenseStats, getPlayerTeamMap, updateAllProps } from '@/lib/enrichment/firestore';
import { fetchAllDefenseStats, lookupDefenseStats } from '@/lib/enrichment/defense';
import { computeScoring, pickBestOdds } from '@/lib/enrichment/scoring';

async function main() {
  // Pick one week 2 prop to trace
  const snap = await db.collection('allProps_2025').where('week', '==', 2).limit(1).get();
  if (snap.empty) { console.log('No week 2 props'); process.exit(0); }

  const doc  = snap.docs[0];
  const r    = doc.data() as Record<string, any>;
  const pick = (...keys: string[]) => { for (const k of keys) { if (r[k] != null && r[k] !== '') return r[k]; } return null; };

  const prop = {
    id:       doc.id,
    player:   pick('player', 'Player') ?? '',
    prop:     pick('prop', 'Prop') ?? '',
    line:     pick('line', 'Line') ?? 0,
    team:     pick('team', 'Team') ?? '',
    matchup:  pick('matchup', 'Matchup') ?? '',
    week:     pick('week', 'Week') ?? 2,
    season:   pick('season', 'Season') ?? 2025,
    overUnder: pick('overUnder', 'over under', 'overunder', 'Over/Under', 'Over/Under?') ?? '',
  };

  console.log('\n🔍 Prop:', JSON.stringify(prop));

  const propNorm    = normalizeProp(prop.prop);
  const priorSeason = 2024;
  console.log('propNorm:', propNorm);

  // 1. Player avg
  console.log('\n1. getPlayerSeasonAvg...');
  const priorAvg = await getPlayerSeasonAvg(prop.player, propNorm, priorSeason);
  console.log('   result:', priorAvg);

  // 2. Defense
  console.log('\n2. Defense stats...');
  const defDoc = `${prop.team.toUpperCase()}_${priorSeason}`;
  const def = await getTeamDefenseStats(
    getOpponent(prop.team, prop.matchup) ?? '',
    propNorm,
    priorSeason
  );
  console.log('   opponent:', getOpponent(prop.team, prop.matchup));
  console.log('   result:', def);

  // 3. Check defense collection size
  const defCount = await db.collection('static_teamDefenseStats').get();
  console.log('\n3. static_teamDefenseStats total docs:', defCount.size);

  // 4. Check a specific defense doc
  const teamSnap = await db.collection('static_teamDefenseStats').doc(`BUF_2024`).get();
  console.log('\n4. BUF_2024 exists:', teamSnap.exists);
  if (teamSnap.exists) console.log('   fields:', Object.keys(teamSnap.data()!).join(', '));

  // 5. Test writing to allProps
  console.log('\n5. Testing updateAllProps write...');
  await updateAllProps(2025, [{ id: doc.id, data: { _debugTest: true } as any }]);
  const verify = await db.collection('allProps_2025').doc(doc.id).get();
  console.log('   _debugTest written:', verify.data()?._debugTest);

  process.exit(0);
}
main().catch(e => { console.error('❌', e); process.exit(1); });