import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Assuming your actual enrichment logic is in these files
// The path and function names should match your project structure
import { enrichAllPropsCollection as enrichNFL } from '@/lib/enrichment/nfl/enrichProps';
import { enrichAllPropsCollection as enrichNBA } from '@/lib/enrichment/nba/enrichProps';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      league = 'nfl', 
      season = new Date().getFullYear(), // Default to current year
      week, 
      skipEnriched = true, // Changed from 'force' to 'skipEnriched'
    } = body;

    const collectionName = `nflProps_${season}`;
    console.log(`
      League: ${league.toUpperCase()}\n
      Collection: ${collectionName}\n
      Season: ${season}\n
      Skip Enriched: ${skipEnriched}\n
      ${week ? `Week: ${week}` : ''}
    `);

    let result;
    const options = { season, week, skipEnriched };

    if (league.toLowerCase() === 'nba') {
      result = await enrichNBA(options);
    } else {
      result = await enrichNFL(options);
    }

    return NextResponse.json({
      message: `Enrichment complete for ${league.toUpperCase()} ${season}.`,
      enrichedCount: result,
      collection: collectionName,
    });

  } catch (err: any) {
    console.error('[API/props/enrich] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
