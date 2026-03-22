import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  enrichNBAPropsForDate,
  enrichAllNBAPropsCollection,
} from '@/lib/enrichment/nba/enrichNBAProps';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const season = parseInt(searchParams.get('season') ?? '2025', 10);
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA');
  const mode = searchParams.get('mode');
  const skipEnriched = searchParams.get('force') !== 'true';

  try {
    // 1. STALE DATA GUARD
    // Checks if there are ungraded props from a previous day.
    const dailyCol = `nbaPropsDaily_${season}`;
    const dailySnap = await adminDb.collection(dailyCol).limit(1).get();
    
    if (!dailySnap.empty) {
      const sample = dailySnap.docs[0].data();
      const sampleDate = sample.gameDate || sample.date;
      
      if (sampleDate && sampleDate !== date) {
        return NextResponse.json({
          warning: true,
          staleDate: sampleDate,
          message: `Clean up ${sampleDate} before enriching today.`
        }, { status: 409 });
      }
    }

    // 2. EXECUTION
    let count = 0;
    if (mode === 'all') {
      count = await enrichAllNBAPropsCollection({ season, skipEnriched });
    } else {
      count = await enrichNBAPropsForDate({ gameDate: date, season, skipEnriched });
    }

    return NextResponse.json({
      success: true,
      enriched: count,
      date,
      mode: mode || 'daily'
    });

  } catch (err: any) {
    console.error('❌ Enrichment Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}