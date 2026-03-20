import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const league = (searchParams.get('league') || 'nba').toLowerCase();
  const season = searchParams.get('season') || '2025';
  const type = searchParams.get('type') || 'props';

  try {
    // 1. Fetching Props
    if (type === 'props' || type === 'players') {
      const collectionName = league === 'nba' 
        ? `nbaProps_${season}` 
        : `allProps_${season}`;

      const q = query(
        collection(db, collectionName), 
        orderBy('confidenceScore', 'desc'), 
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        league, 
        ...doc.data()
      }));

      return NextResponse.json(data);
    }

    // 2. Fetching Schedules
    if (type === 'schedules') {
      const colName = league === 'nba' ? 'static_nba_schedule' : 'static_nfl_schedule'; 
      
      const q = query(
        collection(db, colName), 
        where('season', 'in', [2024, 2025, '2025']), 
        orderBy('date', 'desc'), 
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const games = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return NextResponse.json(games);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}