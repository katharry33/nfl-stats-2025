import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase/admin'; 
// Use the adminDb and FieldValue we exported in your admin.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Calculate the payout on the server to prevent client-side tampering
    const stake = Number(body.stake);
    const odds = Number(body.odds);
    // Logic: Payout = Stake * Odds (e.g., $10 * 2.0 = $20)
    const payout = stake * odds;

    // 2. Prepare the final document
    const finalBet = {
      ...body,
      stake,
      odds,
      payout,
      createdAt: FieldValue.serverTimestamp(), // Firestore generates the time
      updatedAt: FieldValue.serverTimestamp(),
      // In a real app, you'd get the userId from the session/token here
      status: body.status || 'pending',
    };

    const docRef = await adminDb.collection('bettingLog').add(finalBet);

    return NextResponse.json({ 
      success: true, 
      id: docRef.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Save Bet Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}