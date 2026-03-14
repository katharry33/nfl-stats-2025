#!/usr/bin/env tsx
// scripts/debugEnrichState.ts — check what's actually stored and what's missing
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';

async function main() {
  // 1. Check defense stats exist
  const defSnap = await db.collection('static_teamDefenseStats').limit(3).get();
  console.log(`\n🛡️  static_teamDefenseStats: ${defSnap.size} docs found`);
  defSnap.docs.forEach(d => {
    const data = d.data();
    const keys = Object.keys(data).filter(k => !k.startsWith('_'));
    console.log(' -', d.id, '→ fields:', keys.slice(0, 6).join(', '));
  });

  // 2. Check a week 2 prop — what fields are stored after enrich
  const w2 = await db.collection('allProps_2025').where('week', '==', 2).limit(3).get();
  console.log(`\n📋 Week 2 sample docs (post-enrich state):`);
  w2.docs.forEach(d => {
    const r = d.data();
    console.log(`\n  Player: ${r.player ?? r.Player}`);
    console.log(`  playerAvg:         ${r.playerAvg}`);
    console.log(`  opponentRank:      ${r.opponentRank}`);
    console.log(`  opponentAvgVsStat: ${r.opponentAvgVsStat}`);
    console.log(`  scoreDiff:         ${r.scoreDiff}`);
    console.log(`  seasonHitPct:      ${r.seasonHitPct}`);
    console.log(`  confidenceScore:   ${r.confidenceScore}`);
    console.log(`  overUnder:         ${r.overUnder ?? r['over under'] ?? r['overunder']}`);
    console.log(`  team:              ${r.team ?? r.Team}`);
    console.log(`  matchup:           ${r.matchup ?? r.Matchup}`);
  });

  // 3. Check week 1 — still has old Sheets fields?
  const w1 = await db.collection('allProps_2025').where('week', '==', 1).limit(2).get();
  console.log(`\n📋 Week 1 sample (checking for old Sheets fields):`);
  w1.docs.forEach(d => {
    const r = d.data();
    console.log(`\n  Player: ${r.player ?? r.Player}`);
    console.log(`  scoreDiff (camel):  ${r.scoreDiff}`);
    console.log(`  prop.scoreDiff (space): ${r['prop.scoreDiff']}`);
    console.log(`  opponentRank:       ${r.opponentRank}`);
    console.log(`  team:               ${r.team ?? r.Team}`);
  });

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });