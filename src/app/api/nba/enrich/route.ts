// pages/api/nba/enrich.ts
import { NextRequest, NextResponse } from 'next/server';
import { recalculateExistingProps } from '@/lib/enrichment/nba/recalculate';
import { enrichAndSaveCSVProps } from '@/lib/enrichment/nba/enrichAndSaveCSV';
import { startEnrichmentJob } from '@/lib/enrichment/jobRunner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, date, league, season, csvString, uploadId, rows } = body;

    // MODE A: Recalculate existing props for a date (sync small)
    if (mode === 'refine_existing') {
      if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });
      const result = await recalculateExistingProps(Number(season), date);
      return NextResponse.json(result);
    }

    // MODE B: CSV string ingest (sync small)
    if (csvString) {
      const result = await enrichAndSaveCSVProps(csvString, Number(season), date);
      return NextResponse.json(result);
    }

    // MODE C: rows (small manual seed) -> synchronous enrich
    if (rows && Array.isArray(rows) && rows.length <= 20) {
      // enrichAndSaveCSVProps can be reused if it accepts rows; otherwise call a small enrich function
      const result = await enrichAndSaveCSVProps(null as any, Number(season), date, rows);
      return NextResponse.json({ enriched: result });
    }

    // MODE D: background job (uploadId provided)
    if (uploadId) {
      const jobId = await startEnrichmentJob({ uploadId, sport: 'nba', date, season: Number(season) });
      return NextResponse.json({ jobId });
    }

    return NextResponse.json({ error: 'Invalid request mode' }, { status: 400 });
  } catch (error: any) {
    console.error('Enrichment Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
