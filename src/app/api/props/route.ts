// src/app/api/props/route.ts
// GET /api/props?week=14&season=2025&prop=Pass+Yards&minEdge=0.05

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const week   = parseInt(searchParams.get('week')   ?? '0');
    const season = parseInt(searchParams.get('season') ?? '2025');
    const prop     = searchParams.get('prop')     ?? null; // filter by prop type
    const team     = searchParams.get('team')     ?? null;
    const minEdge  = parseFloat(searchParams.get('minEdge') ?? '0');
    const valueOnly = searchParams.get('valueOnly') === 'true'; // 🔥 and ⚠️ only

    if (!week) {
      return NextResponse.json({ error: 'week is required' }, { status: 400 });
    }

    let query = adminDb
      .collection('seasons').doc(String(season))
      .collection('weeks').doc(String(week))
      .collection('props')
      .orderBy('confidenceScore', 'desc') as FirebaseFirestore.Query;

    // Firestore-side filters (index required for compound)
    if (minEdge > 0) {
      query = query.where('bestEdgePct', '>', minEdge);
    }

    const snapshot = await query.get();

    let props = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side filters (no composite index needed)
    if (prop)      props = props.filter(p => (p as any).prop === prop);
    if (team)      props = props.filter(p => (p as any).team === team);
    if (valueOnly) props = props.filter(p => ['🔥', '⚠️'].includes((p as any).valueIcon));

    return NextResponse.json({ props, count: props.length });
  } catch (err) {
    console.error('[/api/props] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}