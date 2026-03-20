// src/app/api/nba/enrich/route.ts
// Triggers NBA prop enrichment (BBRef logs + TeamRankings defense + scoring).
//
// GET /api/nba/enrich?date=YYYY-MM-DD&season=2025          → enrich one date (live)
// GET /api/nba/enrich?mode=all&season=2025                 → full collection backfill
// GET /api/nba/enrich?date=YYYY-MM-DD&force=true&season=2025 → re-enrich already-done props

import { NextRequest, NextResponse } from 'next/server';
import {
  enrichNBAPropsForDate,
  enrichAllNBAPropsCollection,
} from '@/lib/enrichment/nba/enrichNBAProps';

export const dynamic = 'force-dynamic';

// Prevent the route from timing out on Vercel (max 60s on hobby, 300s on pro)
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const season       = parseInt(searchParams.get('season') ?? '2025', 10);
  const date         = searchParams.get('date') ?? '';
  const mode         = searchParams.get('mode') ?? '';       // "all" for full backfill
  const skipEnriched = searchParams.get('force') !== 'true'; // force=true → re-enrich

  try {
    let enriched: number;

    if (mode === 'all') {
      // Full collection scan — used for historical backfill from the Data Hub
      enriched = await enrichAllNBAPropsCollection({
        season,
        gameDate:     date || undefined,
        skipEnriched,
      });
    } else if (date) {
      // Single-date enrichment — triggered after ingest for today's slate
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: 'Invalid date format — use YYYY-MM-DD' },
          { status: 400 },
        );
      }
      enriched = await enrichNBAPropsForDate({ gameDate: date, season, skipEnriched });
    } else {
      // Default: enrich today's date
      const today = new Date().toISOString().split('T')[0];
      enriched = await enrichNBAPropsForDate({ gameDate: today, season, skipEnriched });
    }

    return NextResponse.json({
      success:  true,
      enriched,
      season,
      date:     date || 'today',
      mode:     mode || 'date',
      force:    !skipEnriched,
    });
  } catch (err: any) {
    console.error('❌ NBA enrich route error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Enrichment failed' },
      { status: 500 },
    );
  }
}