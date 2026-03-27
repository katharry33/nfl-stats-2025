// app/api/nfl/enrich/route.ts

import { NextResponse } from 'next/server';
import { runNFLBatchEnrichment } from '@/lib/enrichment/nfl/run-batch';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { season, limit } = body || {};

    if (!season) {
      return NextResponse.json(
        { error: 'Missing required field: season' },
        { status: 400 }
      );
    }

    const result = await runNFLBatchEnrichment(season, limit ?? 100);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('NFL Enrich Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
