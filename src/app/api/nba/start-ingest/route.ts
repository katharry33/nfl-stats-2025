// pages/api/nba/start-ingest.ts
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  const { season, date, uploadId } = await req.json();
  const jobId = uuidv4();
  const jobRef = adminDb.collection('jobs').doc(jobId);
  await jobRef.set({
    jobId,
    type: 'nba-ingest',
    uploadId: uploadId ?? null,
    season,
    date,
    status: 'queued',
    createdAt: new Date().toISOString(),
    progress: { total: 0, processed: 0, errors: 0 },
  });
  // Trigger worker (Cloud Run / Cloud Function) to pick up jobId
  // e.g., publish Pub/Sub or call Cloud Run endpoint with jobId
  return new Response(JSON.stringify({ jobId }), { status: 202 });
}
