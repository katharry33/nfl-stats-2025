import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NormalizedProp } from '@/hooks/useAllProps';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const league = searchParams.get('league') || 'nba';
    const season = searchParams.get('season') || '2025';
    const week   = searchParams.get('week');
    const date   = searchParams.get('date');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit  = parseInt(searchParams.get('limit')  ?? '100');
    const playersParam = searchParams.get('players');

    const collectionName = league === 'nba'
      ? `nbaProps_${season}`
      : `allProps_${season}`;

    console.log(`📡 Fetching ${league.toUpperCase()}: ${collectionName} | Week: ${week} | Date: ${date}`);

    let query: FirebaseFirestore.Query = adminDb.collection(collectionName);

    // ── Optimized Filtering ──────────────────────────────────────────────────
    if (league === 'nba') {
      // For NBA, default to today if no date provided
      const targetDate = date || new Date().toISOString().split('T')[0];
      query = query.where('gameDate', '==', targetDate);
    } else {
      // For NFL, only filter by week if a specific week is requested
      // If week is null/all, we just fetch the collection ordered by confidence
      if (week && week !== 'all') {
        query = query.where('week', '==', parseInt(week));
      }
    }

    if (playersParam) {
      const playerList = playersParam.split(',').slice(0, 30);
      query = query.where('player', 'in', playerList);
    }

    // ── Fetching Logic ───────────────────────────────────────────────────────
    let snapshot: FirebaseFirestore.QuerySnapshot;

    try {
      // Primary attempt: Ranked by confidence
      snapshot = await query
        .orderBy('confidenceScore', 'desc')
        .limit(limit + offset)
        .get();
    } catch (e) {
      // Fallback: If index is missing for orderBy, just get the raw docs
      console.warn("⚠️ Index missing for confidenceScore sort, falling back to basic fetch");
      snapshot = await query.limit(limit + offset).get();
    }

    if (snapshot.empty) return NextResponse.json([]);

    const props: NormalizedProp[] = snapshot.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          league: d.league || league,
          player: d.player || d.Player || null,
          team: d.team || d.Team || null,
          prop: d.prop || d.Prop || null,
          line: d.line || d.Line || null,
          overUnder: d.overUnder || d.overunder || d.over_under || null,
          odds: d.odds || d.bestOdds || -110,
          matchup: d.matchup || d.Matchup || null,
          gameDate: d.gameDate || d.GameDate || null,
          week: d.week || d.Week || null,
          season: d.season || d.Season || null,
          confidenceScore: d.confidenceScore || null,
          actualResult: d.actualResult || d.result || null,
          // ... all other fields remain the same
          playerAvg: d.playerAvg || null,
          seasonHitPct: d.seasonHitPct || null,
          opponentRank: d.opponentRank || null,
          opponentAvgVsStat: d.opponentAvgVsStat || null,
        } as NormalizedProp;
      })
      .filter(p => p.player && p.prop);

    // ── Manual Pagination ────────────────────────────────────────────────────
    const paginated = props.slice(offset, offset + limit);

    return NextResponse.json(paginated, {
      headers: { 'X-Total-Count': String(props.length) },
    });

  } catch (err: any) {
    console.error('❌ API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}