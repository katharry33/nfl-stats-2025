import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week    = searchParams.get('week')   ?? '';
    const status  = searchParams.get('status') ?? '';
    const cursor  = searchParams.get('cursor') ?? ''; // This is the ID of the last doc
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 100);

    let query: FirebaseFirestore.Query = adminDb.collection('bettingLog');

    // 1. Apply Filters
    if (week && week !== 'all') {
      const weekNum = parseInt(week, 10);
      if (!isNaN(weekNum)) query = query.where('week', '==', weekNum);
    }

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    // 2. Sorting
    query = query.orderBy('createdAt', 'desc');

    // 3. Fetch data
    const snapshot = await query.get();
    let allBets = snapshot.docs.map(doc => {
        const data = doc.data();
        const legs = data.legs || [];
        
        // Explicitly derive the type if it's missing or wrong
        const isParlay = legs.length > 1 || data.betType === 'Parlay';

        return {
            id: doc.id,
            ...data,
            legs,
            // Force the correct type for the UI
            betType: isParlay ? 'Parlay' : 'Single',
            // Ensure display fields are mapped for the table columns
            displayDate: data.gameDate || data.date || '—',
            displayWeek: data.week ? `WK ${data.week}` : '—'
        };
    });

    // 4. Handle Pagination Logic
    const startIdx = cursor ? allBets.findIndex(b => b.id === cursor) + 1 : 0;
    const page = allBets.slice(startIdx, startIdx + limit);
    const hasMore = allBets.length > startIdx + limit;
    const nextCursor = hasMore ? (page[page.length - 1]?.id as string) : null;

    return NextResponse.json({
      bets: page,
      hasMore,
      nextCursor,
      totalCount: allBets.length
    });

  } catch (err: any) {
    console.error('❌ betting-log fatal:', err);
    return NextResponse.json(
      { error: err.message, bets: [], hasMore: false }, 
      { status: 500 }
    );
  }
}