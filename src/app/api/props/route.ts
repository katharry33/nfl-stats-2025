import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
// Import your league-specific enrichers
import { enrichNFLProps } from '@/lib/enrichment/nfl/enrichProps';
import { enrichNBAProps } from '@/lib/enrichment/nba/enrichProps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      league = 'nfl', 
      season = 2025, 
      week, 
      force = false 
    } = body;

    // 1. Determine the correct collection hierarchy
    // Priority: allProps_SEASON -> allProps
    const seasonCollection = `allProps_${season}`;
    const masterCollection = 'allProps';
    
    // Check which collection actually has data for this league
    const seasonSnap = await db.collection(seasonCollection).where('league', '==', league).limit(1).get();
    const targetCollection = !seasonSnap.empty ? seasonCollection : masterCollection;

    console.log(`🚀 Target: ${league.toUpperCase()} | Collection: ${targetCollection} | Season: ${season}`);

    // 2. Route to the correct enrichment engine
    let result;
    if (league === 'nba') {
      result = await enrichNBAProps({ collection: targetCollection, season, force });
    } else {
      result = await enrichNFLProps({ collection: targetCollection, season, week, force });
    }

    return NextResponse.json({
      success: true,
      count: result?.enrichedCount ?? 0,
      targetCollection
    });

  } catch (err: any) {
    console.error('❌ Enrichment Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}