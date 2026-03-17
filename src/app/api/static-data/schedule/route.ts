import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonParam = searchParams.get('season');
    const week        = searchParams.get('week');

    // FIX: if no season param provided, return ALL games (don't filter)
    // The old code always filtered by season=2025 but POST never wrote a season field
    let q: FirebaseFirestore.Query = adminDb
      .collection('static_schedule')
      .orderBy('week', 'asc');

    if (seasonParam) {
      q = q.where('season', '==', parseInt(seasonParam, 10));
    }

    if (week) {
      q = q.where('week', '==', parseInt(week, 10));
    }

    const snap  = await q.get();
    const games = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(games);
  } catch (error: any) {
    console.error('[GET /api/static-data/schedule]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to load schedule' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { Week, AwayTeam, HomeTeam, Date: GameDate } = body;

    // FIX: derive and store a season field so GET filters work in future
    // NFL season: Sept–Feb. If month <= 7 it belongs to the prior year's season.
    let season: number | null = null;
    if (GameDate) {
      const dt = new Date(GameDate);
      if (!isNaN(dt.getTime())) {
        const yr = dt.getUTCFullYear();
        const mo = dt.getUTCMonth() + 1;
        season = mo <= 7 ? yr - 1 : yr;
      }
    }

    const ref = await adminDb.collection('static_schedule').add({
      week:      Number(Week) || 0,
      awayTeam:  AwayTeam ?? '',
      homeTeam:  HomeTeam ?? '',
      matchup:   AwayTeam && HomeTeam ? `${AwayTeam} @ ${HomeTeam}` : '',
      'game date': GameDate ?? '',
      season,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (error: any) {
    console.error('[POST /api/static-data/schedule]', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}