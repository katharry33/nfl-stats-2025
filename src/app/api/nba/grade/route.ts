import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin'; // Fixes the "Cannot find namespace 'admin'" error
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function POST(req: Request) {
  try {
    const { date } = await req.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // 1. Fetch Box Scores from your sports API provider
    // Replace with your actual rapidAPI or Balldontlie fetch logic
    const boxScoreRes = await fetch(
      `https://api.balldontlie.io/v1/stats?dates[]=${date}`,
      {
        headers: { Authorization: process.env.BALLDONTLIE_API_KEY || '' },
      }
    );

    if (!boxScoreRes.ok) throw new Error('Failed to fetch stats from provider');
    const { data: stats } = await boxScoreRes.json();

    // 2. Fetch all props for this date from Firestore
    const propsRef = db.collection('props');
    const snapshot = await propsRef
      .where('gameDate', '==', date)
      .where('league', '==', 'nba')
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No props found to grade' });
    }

    const batch = db.batch();
    let gradedCount = 0;

    // 3. Grade each prop
    snapshot.docs.forEach((doc) => {
      const propData = doc.data();
      const playerStats = stats.find(
        (s: any) => 
          s.player.first_name + ' ' + s.player.last_name === propData.player
      );

      if (playerStats) {
        const statValue = playerStats[propData.prop] || 0;
        const isOver = propData.overUnder === 'Over';
        const won = isOver ? statValue > propData.line : statValue < propData.line;

        batch.update(doc.ref, {
          gameStat: statValue,
          actualResult: won ? 'won' : 'lost',
          updatedAt: new Date().toISOString(),
        });
        gradedCount++;
      }
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully graded ${gradedCount} props.` 
    });

  } catch (error: any) {
    console.error('Grading Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}