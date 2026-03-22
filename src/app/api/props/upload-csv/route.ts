import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { props, league, date, season } = await req.json();
    const colName = league === 'nba' ? `nbaProps_${season}` : `allProps_${season}`;
    const batch = db.batch();

    props.forEach((p: any) => {
      // Create a unique ID based on Player, Prop, and Date to prevent duplicates
      const slug = `${p.Player}_${p.Prop}_${date}`.toLowerCase().replace(/\s+/g, '_');
      const docRef = db.collection(colName).doc(slug);

      batch.set(docRef, {
        player:    p.Player,
        matchup:   p.Matchup,
        prop:      p.Prop,
        line:      parseFloat(p.Line),
        bestOdds:  parseInt(p.Odds),
        gameDate:  date,
        league:    league,
        season:    season,
        createdAt: new Date().toISOString(),
        actualResult: null, // Ensure it's empty so it shows in Bet Builder
      }, { merge: true });
    });

    await batch.commit();
    return NextResponse.json({ success: true, count: props.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}