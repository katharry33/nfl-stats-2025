import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function getCollectionName(league: string, season: number) {
  if (league === 'nba') return `nbaProps_${season}`;
  if (league === 'nfl' && season === 2024) return 'allProps'; // legacy NFL
  return `nflProps_${season}`; // future NFL
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const league = searchParams.get('league');
    const season = Number(searchParams.get('season'));
    const date = searchParams.get('date');

    if (!league || !season) {
      return NextResponse.json(
        { error: 'league and season are required' },
        { status: 400 }
      );
    }

    const collection = getCollectionName(league, season);

    let query = adminDb.collection(collection);

    // NBA + future NFL require date
    if (date) {
      query = query.where('gameDate', '==', date);
    }

    const snapshot = await query.get();

    const props = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ props });
  } catch (err) {
    console.error('[GET /api/props] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch props' },
      { status: 500 }
    );
  }
}
