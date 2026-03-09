// src/app/api/all-props/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';

export const dynamic = 'force-dynamic';

const SEASON = 2025;
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache: { props: any[]; propTypes: string[]; week: number; ts: number } | null = null;

// Normalize PascalCase Firestore fields → camelCase for the UI
function normalizeDoc(id: string, data: Record<string, any>) {
  return {
    id,
    player:            data.player            ?? data.Player            ?? '',
    team:              data.team              ?? data.Team              ?? '',
    prop:              data.prop              ?? data.Prop              ?? '',
    line:              data.line              ?? data.Line              ?? 0,
    overUnder:         data.overUnder         ?? data['Over/Under']     ?? '',
    matchup:           data.matchup           ?? data.Matchup           ?? '',
    week:              data.week              ?? data.Week              ?? null,
    season:            data.season            ?? data.Season            ?? SEASON,
    gameDate:          data.gameDate          ?? data.GameDate          ?? null,
    gameTime:          data.gameTime          ?? data.GameTime          ?? '',
    // analytics
    playerAvg:         data.playerAvg         ?? null,
    opponentRank:      data.opponentRank      ?? data['Rank Score']     ?? null,
    opponentAvgVsStat: data.opponentAvgVsStat ?? null,
    yardsScore:        data.yardsScore        ?? data['Yards Score']    ?? null,
    rankScore:         data.rankScore         ?? data['Rank Score']     ?? null,
    totalScore:        data.totalScore        ?? data['Total Score']    ?? null,
    scoreDiff:         data.scoreDiff         ?? data['Score Diff']     ?? null,
    seasonHitPct:      data.seasonHitPct      ?? data['Season Hit %']   ?? null,
    projWinPct:        data.projWinPct        ?? data['Win Probability'] ?? null,
    avgWinProb:        data.avgWinProb        ?? null,
    bestEdgePct:       data.bestEdgePct       ?? null,
    bestEV:            data.bestEV            ?? null,
    bestKellyPct:      data.bestKellyPct      ?? null,
    bestOdds:          data.bestOdds          ?? data.Odds              ?? null,
    bestBook:          data.bestBook          ?? null,
    confidenceScore:   data.confidenceScore   ?? null,
    valueIcon:         data.valueIcon         ?? data['Value Icon']     ?? null,
    actualResult:      data.actualResult      ?? 'pending',
    gameStat:          data.gameStat          ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const bust      = searchParams.get('bust') === '1';
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '10000'), 10000);
    const weekParam = searchParams.get('week');
    const week      = weekParam ? parseInt(weekParam) : getCurrentNFLWeek(SEASON);
    const now       = Date.now();

    if (!bust && serverCache && serverCache.week === week && now - serverCache.ts < SERVER_CACHE_TTL_MS) {
      return NextResponse.json({
        props:     serverCache.props.slice(0, limit),
        propTypes: serverCache.propTypes,
        count:     serverCache.props.length,
        cacheAge:  Math.floor((now - serverCache.ts) / 1000),
        week,
      });
    }

    // Try capital-W Week field first (what the scripts wrote), then lowercase
    let snapshot = await adminDb.collection(`weeklyProps_${SEASON}`).where('Week', '==', week).get();
    if (snapshot.empty) {
      snapshot = await adminDb.collection(`weeklyProps_${SEASON}`).where('week', '==', week).get();
    }

    if (snapshot.empty) {
      return NextResponse.json({ props: [], propTypes: [], count: 0, cacheAge: 0, week,
        message: `No props found in weeklyProps_${SEASON} for Week ${week}` });
    }

    const props = snapshot.docs.map(doc => normalizeDoc(doc.id, doc.data()));

    const propTypes = Array.from(
      new Set(props.map(p => p.prop).filter(Boolean))
    ).sort();

    serverCache = { props, propTypes, week, ts: now };

    return NextResponse.json({ props: props.slice(0, limit), propTypes, count: props.length, cacheAge: 0, week });
  } catch (err) {
    console.error('[/api/all-props] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await adminDb.collection(`weeklyProps_${SEASON}`).doc(id).delete();
    serverCache = null;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/all-props DELETE] Error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}