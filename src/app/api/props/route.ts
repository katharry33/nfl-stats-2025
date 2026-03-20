import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const league = searchParams.get('league') || 'nba';
    const season = searchParams.get('season') || '2025';
    const limit = parseInt(searchParams.get('limit') ?? '100');

    // 1. Point to the "Daily" collection for NBA
    const collectionName = league === 'nba' 
      ? `nbaPropsDaily_${season}` 
      : `allProps_${season}`;

    console.log(`📡 Fetching from: ${collectionName}`);

    let query: FirebaseFirestore.Query = adminDb.collection(collectionName);

    // 2. Sort by last updated so we get the freshest lines
    query = query.orderBy('lastUpdated', 'desc').limit(limit);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    // 3. DEDUPLICATION LOGIC
    // We use a Map to ensure only one unique Player + Prop + Line combo is sent
    const uniquePropsMap = new Map();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Create a unique key (e.g., "ausar thompson_points assists_14.5")
      const uniqueKey = `${data.player}_${data.prop}_${data.line}`.toLowerCase();

      if (!uniquePropsMap.has(uniqueKey)) {
        uniquePropsMap.set(uniqueKey, {
          id: doc.id,
          league: league,
          player: data.player ?? 'Unknown Player',
          team: data.team ?? 'N/A',
          prop: data.prop ?? 'N/A',
          line: data.line ?? 0,
          type: data.type ?? 'Over', // 'Over' or 'Under' from your data
          price: data.price ?? 0,
          matchup: data.matchup ?? 'Game TBD',
          lastUpdated: data.lastUpdated,
          gameId: data.gameId,
          // UI Fallbacks
          confidenceScore: data.confidenceScore ?? 0,
          valueIcon: data.valueIcon ?? '📊',
        });
      }
    });

    const props = Array.from(uniquePropsMap.values());
    return NextResponse.json(props);

  } catch (err: any) {
    console.error(`❌ API Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}