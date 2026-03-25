
import { adminDb } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { DocumentData, Query } from 'firebase-admin/firestore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = searchParams.get('league');
    const season = searchParams.get('season');
    const week = searchParams.get('week');
    const date = searchParams.get('date');
    
    // 1. Determine the Collection Path
    let collectionPath = 'allProps'; // Default
    if (league === 'nba') {
        collectionPath = `nbaProps_${season}`;
    } else if (league === 'nfl') {
        collectionPath = season === '2024' ? 'allProps' : `nflProps_${season}`;
    }

    // 2. Build the Query
    let query: Query<DocumentData> = adminDb.collection(collectionPath);

    // Apply filters
    if (league === 'nfl' && week && week !== 'All') {
      query = query.where('week', '==', Number(week));
    }
    
    if (league === 'nba' && date && date !== 'All') {
      query = query.where('gameDate', '==', date);
    }

    // Common ordering and limit
    query = query.orderBy('gameDate', 'desc').limit(50);

    const snapshot = await query.get();
    const docs = snapshot.docs.map((doc) => {
      const data = doc.data();
      
      // Normalize NBA vs NFL field names so the table can read them
      return {
        id: doc.id,
        player: data.brid || data.player || "Unknown",
        matchup: data.matchup || "N/A",
        prop: data.prop || "N/A",
        line: data.line || 0,
        // Fix the NaN and naming issues
        ev: data.expectedValue || data.ev || 0,
        conf: data.confidenceScore || data.winprobability || 0,
        actual: data.actual || data.result_value || null,
        result: data.modelResult || data.result || "pending",
        gameDate: data.gameDate || data.date || ""
      };
    });

    return NextResponse.json({ docs });

  } catch (error: any) {
    console.error("Error fetching props:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
