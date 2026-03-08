// src/app/api/all-props/route.ts
// GET /api/all-props?limit=10000&bust=1
// Reads CURRENT WEEK's props from weeklyProps_{season}/{week}/props
// Used by useAllProps hook → BetBuilderClient

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';

export const dynamic = 'force-dynamic';

const SEASON = 2025;
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache: { props: any[]; propTypes: string[]; week: number; ts: number } | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const bust  = searchParams.get('bust') === '1';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10000'), 10000);
    const now   = Date.now();

    if (!bust && serverCache && now - serverCache.ts < SERVER_CACHE_TTL_MS) {
      return NextResponse.json({
        props:     serverCache.props.slice(0, limit),
        propTypes: serverCache.propTypes,
        count:     serverCache.props.length,
        cacheAge:  Math.floor((now - serverCache.ts) / 1000),
        week:      serverCache.week,
      });
    }

    const week = getCurrentNFLWeek(SEASON);

    const snapshot = await adminDb
      .collection(`weeklyProps_${SEASON}`)
      .doc(String(week))
      .collection('props')
      .orderBy('confidenceScore', 'desc')
      .get();

    const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const propTypes = Array.from(
      new Set(props.map((p: any) => p.prop).filter(Boolean))
    ).sort() as string[];

    serverCache = { props, propTypes, week, ts: now };

    return NextResponse.json({
      props:     props.slice(0, limit),
      propTypes,
      count:     props.length,
      cacheAge:  0,
      week,
    });
  } catch (err) {
    console.error('[/api/all-props] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}

// DELETE /api/all-props?id=<docId>
// Called by useAllProps.deleteProp()
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const week = getCurrentNFLWeek(SEASON);

    await adminDb
      .collection(`weeklyProps_${SEASON}`)
      .doc(String(week))
      .collection('props')
      .doc(id)
      .delete();

    serverCache = null;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/all-props DELETE] Error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}