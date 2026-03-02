import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await adminDb
      .collection('bettingLog')
      .orderBy('createdAt', 'desc')
      .get();

    const bets = snap.docs.map(d => {
      const data = d.data();
      if (data.createdAt?.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      return { id: d.id, ...data };
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