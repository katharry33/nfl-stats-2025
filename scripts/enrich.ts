#!/usr/bin/env tsx
// scripts/enrich.ts
//
// Usage:
//   npx tsx scripts/enrich.ts --all --season=2025              # enrich all weeks in allProps, season=2025
//   npx tsx scripts/enrich.ts --all --season=2024              # enrich all weeks in allProps, season=2024
//   npx tsx scripts/enrich.ts --all --season=2025 --week=18    # single week in allProps
//   npx tsx scripts/enrich.ts --week=18 --season=2025          # weeklyProps_2025, week 18
//   npx tsx scripts/enrich.ts --all --force                    # force re-enrich even if fields present

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { enrichPropsForWeek, enrichAllPropsCollection } from '@/lib/enrichment/enrichProps';

async function main() {
  if (!db) throw new Error('Firestore DB not initialized. Check your ENV variables.');

  const args    = process.argv.slice(2);
  const useAll  = args.includes('--all');
  const force   = args.includes('--force');
  const weekArg = args.find(a => a.startsWith('--week='))?.split('=')[1];
  const sesArg  = args.find(a => a.startsWith('--season='))?.split('=')[1];
  const week    = weekArg ? parseInt(weekArg, 10)  : undefined;
  const season  = sesArg  ? parseInt(sesArg,  10)  : 2025;

  console.log('\n🏈 SweetSpot Enrichment Runner');
  console.log(`   Mode:          ${useAll ? 'allProps' : 'weeklyProps'}`);
  console.log(`   Season:        ${season}`);
  console.log(`   Week:          ${week ?? 'all'}`);
  console.log(`   Skip enriched: ${!force}`);
  console.log('='.repeat(50));

  if (useAll) {
    const count = await enrichAllPropsCollection({
      season,
      week,
      skipEnriched: !force,
    });
    console.log(`\n✅ allProps enrichment done — ${count} props updated`);
  } else {
    if (!week) {
      console.error('❌ --week=<n> is required for weeklyProps mode');
      process.exit(1);
    }
    const count = await enrichPropsForWeek({ week, season, skipEnriched: !force });
    console.log(`\n✅ weeklyProps enrichment done — ${count} props updated`);
  }
}

main().catch(err => { console.error('❌', err); process.exit(1); });