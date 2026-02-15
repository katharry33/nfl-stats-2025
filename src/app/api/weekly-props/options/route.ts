import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch unique fields from our master collection
    const snapshot = await adminDb.collection('allProps_2025')
      .select('player', 'team', 'week', 'prop')
      .get();

    const players = new Set<string>();
    const teams = new Set<string>();
    const weeks = new Set<number>();
    const props = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.player) players.add(data.player);
      if (data.team) teams.add(data.team);
      if (data.week !== undefined) weeks.add(Number(data.week));
      if (data.prop) props.add(data.prop);
    });

    return NextResponse.json({
      players: Array.from(players).sort(),
      teams: Array.from(teams).sort(),
      // Fixes TS7006 by explicitly typing n, a, and b as numbers
      weeks: Array.from(weeks)
        .filter((n: number) => !isNaN(n))
        .sort((a: number, b: number) => b - a), // Descending for Week 22 at top
      props: Array.from(props).sort(),
    });
  } catch (error: any) {
    console.error('❌ Options API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}