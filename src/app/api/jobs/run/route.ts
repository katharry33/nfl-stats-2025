// app/api/jobs/run/route.ts

import { NextResponse } from 'next/server';
import { runEnrichmentJob } from '@/lib/jobs/jobRunner';

export async function POST(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const result = await runEnrichmentJob(jobId);
  return NextResponse.json({ success: true, result });
}
