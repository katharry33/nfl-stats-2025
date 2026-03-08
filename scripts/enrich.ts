#!/usr/bin/env tsx
// scripts/enrich.ts
// Enriches props already in Firestore with PFR averages, defense stats, and scoring model
//
// Usage:
//   tsx scripts/enrich.ts --week=14
//   tsx scripts/enrich.ts --week=14 --force    # re-enrich already-enriched rows

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

import { enrichPropsForWeek } from '@/lib/enrichment/enrichProps';

const SEASON = 2025;

async function main() {
  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
  if (!weekArg) { console.error('Usage: tsx scripts/enrich.ts --week=14'); process.exit(1); }

  const week = parseInt(weekArg, 10);
  if (isNaN(week)) { console.error('Invalid week number'); process.exit(1); }

  const force = process.argv.includes('--force');

  console.log(`\n🏈 Enriching Week ${week}, Season ${SEASON} (force=${force})`);
  console.log('='.repeat(50));

  const count = await enrichPropsForWeek({ week, season: SEASON, skipEnriched: !force });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${count} props enriched`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });