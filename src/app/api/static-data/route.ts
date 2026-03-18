The Dynamic Route (/api/static-data/schedule/route.ts)
TypeScript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season') || '2024';
  const week = searchParams.get('week');

  const collectionName = `static_schedule_${season}`;
  let query: any = adminDb.collection(collectionName).orderBy('week', 'asc');

  if (week && week !== 'All') {
    query = query.where('week', '==', parseInt(week));
  }

  const snap = await query.get();
  return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function POST(req: NextRequest) {
  try {
    const { week, awayTeam, homeTeam, date, season } = await req.json();

    // 1. Validation: Ensure we have a season to determine the collection
    if (!season) {
      return NextResponse.json({ error: 'Season (Year) is required' }, { status: 400 });
    }

    // 2. Dynamic Collection Name construction
    const collectionName = `static_schedule_${season}`;

    // 3. Save to the specific year's collection
    const ref = await adminDb.collection(collectionName).add({
      week: Number(week),
      awayTeam: awayTeam.trim().toUpperCase(),
      homeTeam: homeTeam.trim().toUpperCase(),
      date,
      season: Number(season),
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: ref.id, collection: collectionName });
  } catch (e: any) {
    console.error('[POST /api/static-data/schedule]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}