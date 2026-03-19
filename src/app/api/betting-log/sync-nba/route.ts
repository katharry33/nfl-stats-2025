import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    // 1. Fetch pending NBA bets
    const snapshot = await adminDb.collection('bettingLog')
      .where('league', '==', 'nba')
      .where('status', '==', 'pending')
      .get();

    if (snapshot.empty) return NextResponse.json({ message: "No pending NBA bets" });

    const batch = adminDb.batch();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const bet = doc.data();
      const results = [];

      for (const leg of bet.legs) {
        // Use BallDontLie to get stats for the specific player on the gameDate
        // Note: You'll need the BDL Player ID saved in the leg or use a name search
        const statsRes = await fetch(`https://api.balldontlie.io/v1/stats?player_ids[]=${leg.bdlId}&dates[]=${leg.gameDate.split('T')[0]}`, {
          headers: { 'Authorization': process.env.BDL_API_KEY! }
        });
        const { data } = await statsRes.json();

        if (data.length > 0) {
          const actualValue = data[0][leg.prop]; // e.g. leg.prop is 'pts' or 'ast'
          const isWin = leg.selection === 'Over' ? actualValue > leg.line : actualValue < leg.line;
          results.push(isWin ? 'won' : 'lost');
        } else {
          results.push('pending');
        }
      }

      // Grade the whole bet (Parlay logic)
      const finalStatus = results.includes('lost') ? 'lost' : results.every(r => r === 'won') ? 'won' : 'pending';
      
      if (finalStatus !== 'pending') {
        batch.update(doc.ref, { status: finalStatus, updatedAt: new Date().toISOString() });
        updatedCount++;
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}