// Add these to the very top of the file
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE));
    const cursor = searchParams.get('cursor');

    // 1. Fetch from both collections
    const [modernSnap, legacySnap] = await Promise.all([
      adminDb.collection('bettingLog').orderBy('createdAt', 'desc').limit(limit).get(),
      adminDb.collection('bets').orderBy('createdAt', 'desc').limit(limit).get()
    ]);

    const uniqueMap = new Map();

    // 2. Process Modern Logs
    modernSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      uniqueMap.set(doc.id, {
        id: doc.id,
        ...data,
        // Ensure standard keys
        player: data.player || data.playerteam, 
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      });
    });

    // 3. Process 2025 Bets (Normalizing to modern schema)
    legacySnap.docs.forEach((doc: any) => {
      const data = doc.data();
      // Use parlayid or doc.id as the unique key to prevent duplicates
      const uniqueKey = data.parlayid || doc.id;

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, {
          id: uniqueKey,
          player: data.playerteam || data.player,
          prop: data.prop,
          line: data.line,
          odds: data.odds,
          selection: data.selection || "", // 2025 data might not have separate selection
          status: data.result || data.status || 'pending',
          matchup: data.matchup,
          week: data.week,
          createdAt: data.createdAt, // 2025 'bets' usually store strings or timestamps
          isLegacy: true
        });
      }
    });

    // 4. Sort and Paginate the merged result
    const allLogs = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ 
      logs: allLogs,
      hasMore: allLogs.length >= limit 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
