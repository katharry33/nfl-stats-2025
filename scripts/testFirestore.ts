#!/usr/bin/env tsx
// scripts/testFirestore.ts — enrichment readiness check
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';

async function check(col: string, limit = 1) {
  try {
    const snap = await db.collection(col).limit(limit).get();
    if (snap.empty) {
      console.log(`  ⚠️  ${col}: EXISTS but empty`);
      return null;
    }
    const data = snap.docs[0].data();
    console.log(`  ✅ ${col}: ${snap.docs.length} sampled`);
    console.log(`     fields: ${Object.keys(data).join(', ')}`);
    return data;
  } catch (err: any) {
    console.log(`  ❌ ${col}: code=${err.code} ${err.message?.slice(0, 60)}`);
    return null;
  }
}

async function main() {
  console.log('\n🔥 ENRICHMENT READINESS CHECK\n');

  console.log('── Props collections ──');
  const p25 = await check('allProps_2025');
  const p24 = await check('allProps_2024');

  console.log('\n── Static collections ──');
  const pfrMap    = await check('static_pfrIdMap');
  const defStats  = await check('static_teamDefenseStats');
  const schedule  = await check('static_schedule');
  const teamMap   = await check('static_playerTeamMapping');
  const seasonAvg = await check('static_playerSeasonStats');

  // Field name audit
  if (p25 || p24) {
    console.log('\n── Field name audit (allProps) ──');
    const sample = p25 ?? p24 ?? {};
    const checks: Record<string, string[]> = {
      'overUnder':         ['overUnder', 'overunder', 'Over/Under?'],
      'playerAvg':         ['playerAvg'],
      'opponentRank':      ['opponentRank'],
      'opponentAvgVsStat': ['opponentAvgVsStat'],
      'seasonHitPct':      ['seasonHitPct'],
      'confidenceScore':   ['confidenceScore'],
      'gameDate':          ['gameDate'],
    };
    for (const [canonical, variants] of Object.entries(checks)) {
      const found = variants.find(v => sample[v] != null);
      console.log(`  ${canonical}: ${found ? `✅ stored as "${found}"` : '❌ missing'}`);
    }
  }

  if (pfrMap) {
    console.log('\n── PFR ID map field names ──');
    console.log('  Sample:', JSON.stringify(pfrMap));
  }

  if (defStats) {
    console.log('\n── Defense stats field names ──');
    console.log('  Sample:', JSON.stringify(defStats));
  }

  if (schedule) {
    console.log('\n── Schedule field names ──');
    console.log('  Sample:', JSON.stringify(schedule));
  }
}

main().catch(err => console.error('❌', err.message ?? err));