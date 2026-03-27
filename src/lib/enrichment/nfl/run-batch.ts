// src/lib/enrichment/nfl/run-batch.ts

import { adminDb } from '@/lib/firebase/admin';
import type { NFLPropDoc, PropDoc } from '@/lib/types';
import { buildNFLEnrichmentContext, enrichSingleNFLProp } from './enrich-single';

export async function runNFLBatchEnrichment(
  season: number,
  limit = 100
): Promise<{ processed: number }> {
  const collectionName = `nflProps_${season}`;

  const snap = await adminDb
    .collection(collectionName)
    .where('status', '==', 'pending')
    .limit(limit)
    .get();

  if (snap.empty) return { processed: 0 };

  const ctx = await buildNFLEnrichmentContext(season);

  const batch = adminDb.batch();
  let processed = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as NFLPropDoc;
    const enriched: PropDoc = await enrichSingleNFLProp(data, ctx);

    batch.set(doc.ref, enriched, { merge: true });
    processed++;
  }

  await batch.commit();

  return { processed };
}
