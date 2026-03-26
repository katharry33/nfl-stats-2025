// lib/enrichment/jobRunner.ts (Node runtime)
import { adminDb } from '@/lib/firebase/admin';
import { GET as ingestHandler } from '@/pages/api/nba/ingest'; // or refactor ingest logic into a callable function

export async function runIngestJob(jobId: string) {
  const jobRef = adminDb.collection('jobs').doc(jobId);
  const job = (await jobRef.get()).data();
  if (!job) throw new Error('Job not found');

  await jobRef.update({ status: 'running', updatedAt: new Date().toISOString() });

  try {
    // call your ingest logic programmatically (refactor ingest into a function you can call)
    const result = await runIngest({ season: job.season, date: job.date, uploadId: job.uploadId });
    await jobRef.update({ status: 'completed', result, updatedAt: new Date().toISOString() });

    // optionally trigger enrichment
    await fetch(`${process.env.BASE_URL}/api/nba/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'refine_existing', date: job.date, season: job.season })
    });
  } catch (err: any) {
    await jobRef.update({ status: 'failed', error: String(err), updatedAt: new Date().toISOString() });
    throw err;
  }
}
