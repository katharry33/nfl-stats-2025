// src/app/api/props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NormalizedProp } from '@/hooks/useAllProps';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const league = searchParams.get('league') || 'nfl';
    const season = searchParams.get('season') || '2025';
    const week = searchParams.get('week');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    const collectionName = league === 'nba' 
      ? `nbaProps_${season}` 
      : `allProps_${season}`;

    console.log(`Fetching from: ${collectionName}`);

    let query: FirebaseFirestore.Query = adminDb.collection(collectionName);

    if (week) {
      query = query.where('week', '==', parseInt(week));
    }

    const snapshot = await query
      .orderBy('confidenceScore', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const props: NormalizedProp[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        league: data.league,
        player: data.player ?? null,
        team: data.team ?? null,
        prop: data.prop ?? null,
        line: data.line ?? null,
        overUnder: data.overUnder ?? null,
        odds: data.odds ?? null,
        bestOdds: data.bestOdds ?? null,
        bestBook: data.bestBook ?? null,
        matchup: data.matchup ?? null,
        gameDate: data.gameDate ?? null,
        week: data.week ?? null,
        season: data.season ?? null,
        valueIcon: data.valueIcon ?? null,
        playerAvg: data.playerAvg ?? null,
        seasonHitPct: data.seasonHitPct ?? null,
        opponentRank: data.opponentRank ?? null,
        opponentAvgVsStat: data.opponentAvgVsStat ?? null,
        scoreDiff: data.scoreDiff ?? null,
        confidenceScore: data.confidenceScore ?? null,
        avgWinProb: data.avgWinProb ?? null,
        bestEdgePct: data.bestEdgePct ?? null,
        expectedValue: data.expectedValue ?? null,
        kellyPct: data.kellyPct ?? null,
        projWinPct: data.projWinPct ?? null,
        impliedProb: data.impliedProb ?? null,
        fdOdds: data.fdOdds ?? null,
        dkOdds: data.dkOdds ?? null,
        pace: data.pace ?? null,
        defRating: data.defRating ?? null,
      };
    });

    return NextResponse.json(props);

  } catch (err: any) {
    console.error(`Error in /api/props for ${URLSearchParams.toString()}:`, err);
    return NextResponse.json({ error: err.message || 'Failed to fetch props' }, { status: 500 });
  }
}
