// src/app/api/props/route.ts
// GET /api/props?week=14&season=2025&prop=Pass+Yards&minEdge=0.05
// Reads from HISTORICAL allProps_{season} collection (post-game, finalized)
// Used by analytics / history pages

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const season    = parseInt(searchParams.get('season')  ?? '2025');
    const week      = parseInt(searchParams.get('week')    ?? '0');
    const prop      = searchParams.get('prop')      ?? null;
    const team      = searchParams.get('team')      ?? null;
    const minEdge   = parseFloat(searchParams.get('minEdge')  ?? '0');
    const valueOnly = searchParams.get('valueOnly') === 'true';
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '1000'), 5000);

    let query = adminDb
      .collection(`allProps_${season}`)
      .orderBy('confidenceScore', 'desc') as FirebaseFirestore.Query;

    // Firestore-side filters
    if (week > 0)   query = query.where('week', '==', week);
    if (minEdge > 0) query = query.where('bestEdgePct', '>', minEdge);

    query = query.limit(limit);

    const snapshot = await query.get();

    let props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side filters
    if (prop)      props = props.filter(p => (p as any).prop === prop);
    if (team)      props = props.filter(p => (p as any).team === team);
    if (valueOnly) props = props.filter(p => ['🔥', '⚠️'].includes((p as any).valueIcon));

    return NextResponse.json({ props, count: props.length, season, week: week || null });
  } catch (err) {
    console.error('[/api/props] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}