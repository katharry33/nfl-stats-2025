import { NextResponse } from 'next/server';
import { getBettingLog } from '@/lib/firebase/server/queries';

export async function GET() {
  try {
    // This now fetches the master betting log, not user-specific bets.
    const bets = await getBettingLog(100); // Fetch up to 100 bets
    return NextResponse.json(bets);
  } catch (error) {
    console.error('API route getBettingLog error:', error);
    return NextResponse.json({ error: 'Failed to fetch betting log' }, { status: 500 });
  }
}
