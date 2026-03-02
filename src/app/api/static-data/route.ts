import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') ?? '2025', 10);
    const week   = searchParams.get('week');

    let q: FirebaseFirestore.Query = adminDb
      .collection('static_schedule')
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

export async function POST(req: NextRequest) {
  const { Week, AwayTeam, HomeTeam, Date } = await req.json();
  const ref = await adminDb.collection('static_schedule').add({
    Week, AwayTeam, HomeTeam, Date,
    createdAt: Timestamp.now(),
  });
  return NextResponse.json({ id: ref.id });
}