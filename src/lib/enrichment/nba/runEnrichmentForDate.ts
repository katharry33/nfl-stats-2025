// src/lib/enrichment/nba/runEnrichmentForDate.ts

import { adminDb } from '@/lib/firebase/admin';
import { enrichSingleNBAProp } from './enrichSingleProp';

/**
 * Runs enrichment for all NBA props on a given slate date.
 * This is called by the /api/nba/enrich route.
 */
export async function runNBAEnrichmentForDate(season: number, date: string) {
  const collectionName = `nbaProps_${season}`;
  const snapshot = await adminDb
    .collection(collectionName)
    .where('gameDate', '==', date)
    .get();

  if (snapshot.empty) {
    return {
      success: true,
      enriched: 0,
      message: `No props found for ${date}`,
    };
  }

  let enrichedCount = 0;

  // Enrich each prop (parallel but controlled)
  const tasks = snapshot.docs.map(async (doc) => {
    try {
      await enrichSingleNBAProp(doc);
      enrichedCount++;
    } catch (err) {
      console.error(`Failed to enrich ${doc.id}:`, err);
    }
  });

  await Promise.all(tasks);

  return {
    success: true,
    enriched: enrichedCount,
    total: snapshot.size,
    message: `Enriched ${enrichedCount} of ${snapshot.size} props for ${date}`,
  };
}
