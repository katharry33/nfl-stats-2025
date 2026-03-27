// src/lib/jobs/jobRunner.ts

import { adminDb } from '@/lib/firebase/admin';
import { runNFLBatchEnrichment } from '@/lib/enrichment/nfl/run-batch';
import { runNBAEnrichmentForDate } from '@/lib/enrichment/nba/runEnrichmentForDate';

export async function runEnrichmentJob(jobId: string) {
  const ref = adminDb.collection('jobs').doc(jobId);
  const snap = await ref.get();

  if (!snap.exists) {
    console.error(`❌ Job not found: ${jobId}`);
    return;
  }

  const job = snap.data()!;
  const { sport, season, date } = job;

  // Mark job as running
  await ref.update({
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  try {
    let result: any = null;

    if (sport === 'nfl') {
      // NFL enrichment runs in batches
      result = await runNFLBatchEnrichment(season);
    }

    if (sport === 'nba') {
      // NBA enrichment runs for a specific date
      result = await runNBAEnrichmentForDate(season, date);
    }

    await ref.update({
      status: 'complete',
      finishedAt: new Date().toISOString(),
      progress: {
        total: result?.total ?? result?.processed ?? 0,
        processed: result?.processed ?? result?.enriched ?? 0,
        errors: result?.errors ?? 0,
      },
    });

    console.log(`✅ Job ${jobId} complete`);
    return result;
  } catch (err: any) {
    console.error(`❌ Job ${jobId} failed:`, err);

    await ref.update({
      status: 'error',
      error: err.message || String(err),
      finishedAt: new Date().toISOString(),
    });

    return null;
  }
}
