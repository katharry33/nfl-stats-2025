import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { week, awayTeam, homeTeam, date, season } = await req.json();

    if (!season || !week || !awayTeam || !homeTeam) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const collectionName = `static_schedule_${season}`;
    
    // Create a unique ID: "week-1-bal-kc"
    // This makes duplicates impossible because the ID will be identical
    const customId = `week-${week}-${awayTeam}-${homeTeam}`.toLowerCase().replace(/\s+/g, '-');

    await adminDb.collection(collectionName).doc(customId).set({
      week: Number(week),
      awayTeam: awayTeam.trim().toUpperCase(),
      homeTeam: homeTeam.trim().toUpperCase(),
      date,
      season: Number(season),
      updatedAt: new Date().toISOString(),
    }, { merge: true }); // Merge ensures we don't wipe out other fields if they exist

    return NextResponse.json({ id: customId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}