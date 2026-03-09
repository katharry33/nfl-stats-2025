#!/usr/bin/env tsx
// scripts/enrich.ts
//
// Usage:
//   tsx scripts/enrich.ts --week=14                         # enrich weeklyProps_2025/14
//   tsx scripts/enrich.ts --week=14 --all                   # enrich allProps_2025 for week 14
//   tsx scripts/enrich.ts --all                             # enrich ALL of allProps_2025
//   tsx scripts/enrich.ts --week=14 --force                 # re-enrich already-enriched rows
//   tsx scripts/enrich.ts --week=14 --all --force

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

import { enrichPropsForWeek, enrichAllPropsCollection } from '@/lib/enrichment/enrichProps';

const SEASON = 2025;

async function main() {
  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
  const force   = process.argv.includes('--force');
  const useAll  = process.argv.includes('--all');

  if (useAll) {
    // ── Enrich from allProps_2025 ──────────────────────────────────────────
    const week = weekArg ? parseInt(weekArg, 10) : null;
    console.log(`\n🏈 Enriching ${week ? `Week ${week}` : 'ALL weeks'} from allProps_${SEASON} (force=${force})`);
    console.log('='.repeat(55));

    const count = await enrichAllPropsCollection({ season: SEASON, week: week ?? undefined, skipEnriched: !force });

    console.log('\n' + '='.repeat(55));
    console.log(`✅ Done: ${count} historical props enriched`);
    return;
  }

  // ── Enrich from weeklyProps_2025 (default) ─────────────────────────────
  if (!weekArg) {
    console.error('Usage: tsx scripts/enrich.ts --week=14 [--force] [--all]');
    process.exit(1);
  }

  const week = parseInt(weekArg, 10);
  if (isNaN(week)) { console.error('Invalid week number'); process.exit(1); }

  console.log(`\n🏈 Enriching weeklyProps_${SEASON} Week ${week} (force=${force})`);
  console.log('='.repeat(55));

  const count = await enrichPropsForWeek({ week, season: SEASON, skipEnriched: !force });

  console.log('\n' + '='.repeat(55));
  console.log(`✅ Done: ${count} props enriched`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });