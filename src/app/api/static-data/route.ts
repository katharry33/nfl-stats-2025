// src/app/api/static-data/schedule/route.ts
// Replaced getStaticSchedule import (which didn't exist) with direct adminDb query.
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') ?? '2025', 10);
    const week   = searchParams.get('week');

    let q: FirebaseFirestore.Query = adminDb
      .collection('schedule')
      .where('season', '==', season)
      .orderBy('week', 'asc');

    if (week) {
      q = (q as any).where('week', '==', parseInt(week, 10));
    }

    const snap = await q.get();
    const games = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(games);
  } catch (error: any) {
    console.error('[GET /api/static-data/schedule]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to load schedule' }, { status: 500 });
  }
}