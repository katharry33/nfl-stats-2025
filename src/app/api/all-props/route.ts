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
  
  // Use 'league' to match your hook's param, fallback to 'sport' for backward compatibility
  const league = (searchParams.get('league') || searchParams.get('sport') || 'nba').toLowerCase();
  const type = searchParams.get('type') || 'props'; // Default to 'props' for useAllProps

  try {
    // 1. Fetching Props (for your PropsTable)
    if (type === 'props' || type === 'players') {
      const collectionName = league === 'nba' ? 'props_nba' : 'props_nfl';
      
      // Note: Ensure your Firestore documents include 'pace' and 'defRating' for NBA
      const q = query(
        collection(db, collectionName), 
        orderBy('confidenceScore', 'desc'), 
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        league, // Explicitly pass league for the frontend logic
        ...doc.data()
      }));

      return NextResponse.json(data);
    }

    // 2. Fetching Schedules
    if (type === 'schedules') {
      const colName = league === 'nba' ? 'static_nba_schedule' : 'static_nfl_schedule'; 
      
      const q = query(
        collection(db, colName), 
        // Handles multiple formats of season year
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
    // Return a structured error for the frontend hook to catch
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}