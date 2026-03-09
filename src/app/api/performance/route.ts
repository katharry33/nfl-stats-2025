import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch from 'bettingLog'
    const snap = await db
      .collection('bettingLog')
      .orderBy('createdAt', 'desc')
      .get();

    const bets = snap.docs.map(d => {
      const data = d.data();
      
      // 2. Convert Firestore Timestamps to ISO Strings for the client
      if (data.createdAt?.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }

      // 3. Normalization: Ensure every bet has a 'legs' structure
      // If it's a single bet, we wrap its info into a one-item array
      // so the Accuracy logic in the UI can loop through it consistently.
      const normalizedLegs = data.legs || [
        {
          player: data.player || 'Unknown Player',
          prop: data.prop || 'Other',
          line: data.line,
          actualResult: data.actualResult || data.status,
        },
      ];

      return {
        id: d.id,
        ...data,
        // Ensure numbers are actually numbers
        stake: Number(data.stake || data.wager || 0),
        odds: Number(data.odds || 0),
        legs: normalizedLegs,
      };
    });

    return NextResponse.json(bets);
  } catch (error: any) {
    console.error('Performance API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bets' },
      { status: 500 }
    );
  }
}