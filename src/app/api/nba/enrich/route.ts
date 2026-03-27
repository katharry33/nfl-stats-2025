// app/api/nba/enrich/route.ts

import { NextResponse } from 'next/server';
import { runNBAEnrichmentForDate } from '@/lib/enrichment/nba/runEnrichmentForDate';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { season, date } = body;

    if (!season || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: season, date' },
        { status: 400 }
      );
    }

    // Create a job entry for UI polling
    const jobRef = adminDb.collection('jobs').doc();
    await jobRef.set({
      id: jobRef.id,
      type: 'nba_enrich',
      season,
      date,
      status: 'running',
      createdAt: new Date().toISOString(),
    });

    // Run enrichment
    const result = await runNBAEnrichmentForDate(season, date);

    // Update job status
    await jobRef.update({
      status: 'complete',
      enriched: result.enriched,
      total: result.total,
      finishedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      jobId: jobRef.id,
      enriched: result.enriched,
      total: result.total,
      message: result.message,
    });
  } catch (err: any) {
    console.error('NBA Enrich Error:', err);

    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
