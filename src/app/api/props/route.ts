// src/app/api/props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NormalizedProp } from '@/hooks/useAllProps';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const league  = searchParams.get('league')  || 'nba';
    const season  = searchParams.get('season')  || '2025';
    const week    = searchParams.get('week');
    const date    = searchParams.get('date')    || '';
    const offset  = parseInt(searchParams.get('offset') ?? '0');
    const limit   = parseInt(searchParams.get('limit')  ?? '100');

    // ── Collection routing ────────────────────────────────────────────────────
    const collectionName = league === 'nba'
      ? `nbaProps_${season}`
      : `allProps_${season}`;

    console.log(`📡 Fetching from: ${collectionName} date=${date} week=${week}`);

    let query: FirebaseFirestore.Query = adminDb.collection(collectionName);

    // ── Filtering ─────────────────────────────────────────────────────────────
    // NBA uses gameDate; NFL uses week number
    if (league === 'nba') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      query = query.where('gameDate', '==', targetDate);
    } else if (week) {
      query = query.where('week', '==', parseInt(week));
    }

    // ── Ordering ──────────────────────────────────────────────────────────────
    // For NBA: gameDate filter + confidenceScore orderBy requires a composite
    // index. Skip ordering entirely and sort in-memory after fetch to avoid
    // index errors. Firestore returns docs in insertion order without orderBy.
    // For NFL: allProps collection has no gameDate filter so single-field
    // confidenceScore orderBy works fine.
    let snapshot: FirebaseFirestore.QuerySnapshot;
    if (league === 'nba') {
      // No orderBy — sort in memory after fetch
      snapshot = await query.limit(limit + offset).get();
    } else {
      try {
        snapshot = await query
          .orderBy('confidenceScore', 'desc')
          .offset(offset)
          .limit(limit)
          .get();
      } catch {
        snapshot = await query.limit(limit).get();
      }
    }

    if (snapshot.empty) {
      console.log(`📭 No props found in ${collectionName}`);
      return NextResponse.json([]);
    }

    // ── Normalize ─────────────────────────────────────────────────────────────
    const props: NormalizedProp[] = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id:                doc.id,
        league:            d.league            ?? league,
        player:            d.player            ?? null,
        team:              d.team              ?? null,
        prop:              d.prop              ?? null,
        line:              d.line              ?? null,
        overUnder:         d.overUnder         ?? null,
        odds:              d.odds              ?? null,
        bestOdds:          d.bestOdds          ?? null,
        bestBook:          d.bestBook          ?? null,
        matchup:           d.matchup           ?? null,
        gameDate:          d.gameDate          ?? null,
        week:              d.week              ?? null,
        season:            d.season            ?? null,
        // ── Enrichment fields ──────────────────────────────────────────────
        playerAvg:         d.playerAvg         ?? null,
        seasonHitPct:      d.seasonHitPct      ?? null,
        opponentRank:      d.opponentRank      ?? null,
        opponentAvgVsStat: d.opponentAvgVsStat ?? null,
        scoreDiff:         d.scoreDiff         ?? null,
        confidenceScore:   d.confidenceScore   ?? null,
        projWinPct:        d.projWinPct        ?? null,
        avgWinProb:        d.avgWinProb        ?? null,
        bestEdgePct:       d.bestEdgePct       ?? null,
        expectedValue:     d.expectedValue     ?? null,
        kellyPct:          d.kellyPct          ?? null,
        valueIcon:         d.valueIcon         ?? null,
        impliedProb:       d.impliedProb       ?? null,
        // ── Optional fields ────────────────────────────────────────────────
        valueScore:        d.valueScore        ?? null,
        avgWinProb2:       d.avgWinProb        ?? null, // alias for some UI components
        fdOdds:            d.fdOdds            ?? null,
        dkOdds:            d.dkOdds            ?? null,
        pace:              d.pace              ?? null,
        defRating:         d.defRating         ?? null,
        // ── IDs (for grading) ──────────────────────────────────────────────
        bdlId:             d.bdlId             ?? null,
        brid:              d.brid              ?? null,
      };
    });

    // Sort NBA results in memory by confidenceScore desc (nulls last)
    if (league === 'nba') {
      props.sort((a, b) => {
        const ac = (a as any).confidenceScore ?? -1;
        const bc = (b as any).confidenceScore ?? -1;
        return bc - ac;
      });
    }

    const page = league === 'nba' ? props.slice(offset, offset + limit) : props;
    console.log(`✅ Returning ${page.length} props`);
    return NextResponse.json(page);

  } catch (err: any) {
    console.error('❌ /api/props error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch props' },
      { status: 500 },
    );
  }
}