import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Query, DocumentData } from 'firebase-admin/firestore';

// Determine collection based on league + season
function getCollectionName(league: string, season: number) {
  if (league === 'nfl') {
    // NFL is currently stored in allProps (legacy)
    return 'allProps';
  }

  if (league === 'nba') {
    // NBA is currently stored in nbaProps_2025
    return 'nbaProps_2025';
  }

  throw new Error(`Unsupported league: ${league}`);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const league = searchParams.get('league');
    const season = Number(searchParams.get('season'));
    const date = searchParams.get('date'); // NBA
    const week = searchParams.get('week'); // NFL

    if (!league || !season) {
      return NextResponse.json(
        { error: 'league and season are required' },
        { status: 400 }
      );
    }

    const collection = getCollectionName(league, season);

    let query: Query<DocumentData> = adminDb.collection(collection);

    // NFL week filter
    if (league === 'nfl' && week) {
      query = query.where('week', '==', Number(week));
    }

    // NBA date filter
    if (league === 'nba' && date) {
      query = query.where('gameDate', '==', date);
    }

    const snapshot = await query.get();

    const props = snapshot.docs.map((doc) => {
      const d = doc.data();

      // Normalize matchup: "SEA@TEN" → "SEA @ TEN"
      const matchup = d.matchup
        ? d.matchup.replace('@', ' @ ')
        : `${d.team} @ ${d.opponent}`;

      return {
        id: doc.id,
        ...d,

        // Normalized matchup for UI
        matchup,

        // Normalized enrichment fields
        playerAvg: d.playerAvg ?? d['player avg'] ?? null,
        scoreDiff: d.scoreDiff ?? d['score diff'] ?? null,
        modelProb:
          d.modelProb ??
          d['proj win %'] ??
          d['avg win prob'] ??
          null,

        opponentRank: d.opponentRank ?? d['opponent rank'] ?? null,
        opponentAvgVsStat:
          d.opponentAvgVsStat ??
          d['opponent avg vs stat'] ??
          null,

        seasonHitPct: d.seasonHitPct ?? d['season hit %'] ?? null,

        actual: d.actual ?? d['actual stats'] ?? null,
        result: d.result ?? d['actual stats'] ?? null,
      };
    });

    return NextResponse.json({ props });
  } catch (err) {
    console.error('[GET /api/props] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch props' },
      { status: 500 }
    );
  }
}
