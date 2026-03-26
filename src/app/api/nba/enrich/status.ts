// pages/api/nba/enrich/status.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const jobId = searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

    const doc = await adminDb.collection('jobs').doc(jobId).get();
    if (!doc.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const data = doc.data();
    return NextResponse.json({
      status: data?.status ?? 'unknown',
      progress: data?.progress ?? null,
      result: data?.result ?? null,
      error: data?.error ?? null,
      createdAt: data?.createdAt ?? null,
      updatedAt: data?.updatedAt ?? null,
    });
  } catch (err: any) {
    console.error('Job status error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
