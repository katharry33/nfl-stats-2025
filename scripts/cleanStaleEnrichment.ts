#!/usr/bin/env tsx
// scripts/cleanStaleEnrichment.ts
//
// One-time migration: removes spurious zero values written by old enrichment code.
//
// Stale patterns this fixes:
//   • seasonHitPct: 0   → deleted  (0 means "no qualifying games", not "never hit")
//   • playerAvg: 0      → deleted  (0 means "no logs found", not "zero production")
//   • scoreDiff: 0      → kept     (a genuine 0 diff is valid)
//   • expectedValue: 0  → deleted  (0 means scoring didn't run, not "no edge")
//   • kellyPct: 0       → deleted  (same — scoring didn't run)
//   • confidenceScore: 0 → deleted (same)
//
// Usage:
//   npx tsx scripts/cleanStaleEnrichment.ts [--season=2025] [--all-seasons] [--dry-run]
//
// Options:
//   --season=<n>      Target a single season (default: 2025)
//   --all-seasons     Process both 2024 and 2025
//   --dry-run         Print counts but do not write to Firestore

import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const ALL       = args.includes('--all-seasons');
const SEASON    = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const SEASONS   = ALL ? [2024, 2025] : [SEASON];

/**
 * Fields where a stored `0` means "enrichment produced no data" — not a
 * meaningful zero. These should be deleted so the table shows "—" instead
 * of misleading 0% / 0 values, and re-enrichment will fill them correctly.
 */
const ZERO_IS_MISSING: string[] = [
  'seasonHitPct',
  'playerAvg',
  'expectedValue',
  'kellyPct',
  'confidenceScore',
  'bestEdgePct',
  'projWinPct',
  'avgWinProb',
];

/**
 * Legacy field names from old Google Sheets import that should always be
 * removed. Their canonical equivalents (camelCase) carry the right values.
 */
const LEGACY_FIELDS: string[] = [
  'Score Diff',
  'Season Hit %',
  'actual stats',
  'Actual stats',
  'Actual Stats',
  'game stats',
  'Game Stats',
  'Player Avg',
  'Opponent Rank',
  'Opponent Avg vs Stat',
  'Confidence Score',
  'Over/Under?',
  'Over/Under',
  'over under',
  'Bet Amount',
  'Best Odds',
  'FdOdds',
  'DkOdds',
];

async function cleanCollection(colName: string): Promise<{ scanned: number; cleaned: number }> {
  console.log(`\n🔍 Scanning ${colName}…`);

  const snapshot = await db.collection(colName).get();
  console.log(`   ${snapshot.size} docs`);

  let cleaned = 0;
  const batches: Array<ReturnType<typeof db.batch>> = [];
  let currentBatch = db.batch();
  let opsInBatch   = 0;

  for (const doc of snapshot.docs) {
    const data  = doc.data();
    const update: Record<string, any> = {};
    let   dirty = false;

    // Remove stale zero values
    for (const field of ZERO_IS_MISSING) {
      if (data[field] === 0 || data[field] === '0') {
        update[field] = FieldValue.delete();
        dirty = true;
      }
    }

    // Remove legacy field names
    for (const field of LEGACY_FIELDS) {
      if (data[field] !== undefined) {
        update[field] = FieldValue.delete();
        dirty = true;
      }
    }

    if (!dirty) continue;

    if (!DRY_RUN) {
      currentBatch.update(doc.ref, update);
      opsInBatch++;
      if (opsInBatch >= 400) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        opsInBatch   = 0;
      }
    }
    cleaned++;
  }

  if (!DRY_RUN && opsInBatch > 0) batches.push(currentBatch);

  if (!DRY_RUN) {
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`   💾 Committed batch ${i + 1} / ${batches.length}`);
    }
  }

  return { scanned: snapshot.size, cleaned };
}

async function main() {
  console.log(`\n🧹 Clean Stale Enrichment Fields`);
  console.log(`   Seasons: ${SEASONS.join(', ')}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log('='.repeat(50));

  const collections: string[] = [];
  for (const season of SEASONS) {
    collections.push(`allProps_${season}`, `weeklyProps_${season}`);
  }

  let totalScanned = 0;
  let totalCleaned = 0;

  for (const col of collections) {
    try {
      const { scanned, cleaned } = await cleanCollection(col);
      totalScanned += scanned;
      totalCleaned += cleaned;
      console.log(`   ✅ ${col}: ${cleaned} / ${scanned} docs had stale fields ${DRY_RUN ? '(dry run)' : 'cleaned'}`);
    } catch (err: any) {
      // Collection might not exist — that's fine
      if (err?.code === 5 || err?.message?.includes('NOT_FOUND')) {
        console.log(`   ⏭️  ${col}: collection not found, skipping`);
      } else {
        console.error(`   ❌ ${col}:`, err);
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Done: ${totalCleaned} / ${totalScanned} docs ${DRY_RUN ? 'would be' : 'were'} cleaned`);

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes.');
    console.log('   After cleaning, re-run enrichment with skipEnriched=false to repopulate fields.');
  } else {
    console.log('\n💡 Next step: re-run enrichment to repopulate cleaned fields.');
    console.log('   npx tsx scripts/enrich.ts --season=2025 --skip-enriched=false');
  }
}

main().catch(err => { console.error('❌', err); process.exit(1); });