import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const player = searchParams.get('player');
    const prop   = searchParams.get('prop');
    const week   = searchParams.get('week');
    const season = searchParams.get('season'); // New parameter

    let query: FirebaseFirestore.Query = adminDb.collection('allProps');

    if (season && season !== 'all') {
      query = query.where('season', '==', parseInt(season, 10));
    }
    if (week && week !== 'all') {
      query = query.where('week', '==', parseInt(week, 10));
    }
    if (prop && prop !== 'all') {
      query = query.where('prop', '==', prop);
    }
    if (player) {
      // Exact match for the unified player name
      query = query.where('player', '==', player.trim());
    }

    const snapshot = await query.orderBy('week', 'desc').get();
    
    const props = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure gameDate is mapped correctly if it was stored as game_date or date
        gameDate: data.gameDate || data.date || data['Game Date'] || null
      };
    });

    return NextResponse.json({ props });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}