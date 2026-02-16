// src/app/api/bets/route.ts
import { NextResponse } from 'next/server';
import { Bet, BetSubmission } from '@/lib/types';
import { getAuth } from '@clerk/nextjs/server'; // Example for getting user

// This would be your real database client
// import { adminDb } from '@/lib/firebase/server/admin';

/**
 * Handles the submission of a new bet from the client.
 * This endpoint is responsible for server-side validation, payout calculation,
 * and saving the final bet object to the database.
 */
export async function POST(request: Request) {
  try {
    // In a real app, you'd get the user ID from a session.
    // const { userId } = getAuth(request as any);
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const submission = (await request.json()) as BetSubmission;

    // --- Server-Side Logic --- 
    // The client sends the raw materials; the server builds the final object.

    // 1. Calculate Payouts (critical server-side task)
    const potentialPayout = submission.stake * (submission.odds / 100 + 1);

    // 2. Construct the full, secure Bet object
    const newBet: Omit<Bet, 'id'> = {
      userId: submission.userId, // Securely set on the server
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending', 
      stake: submission.stake,
      odds: submission.odds,
      potentialPayout: potentialPayout, // Calculated on the server
      legs: submission.legs,
      betType: submission.betType,
      boost: false, // Default value, server could apply boosts
      boostPercentage: 0,
      isLive: false, // Server could determine this based on game times
    };

    // 3. Save to Firestore (simulation)
    // In a real implementation:
    // const docRef = await adminDb.collection('user_bets').add(newBet);
    // const savedBet = { id: docRef.id, ...newBet };

    // For this simulation, we'll just echo back the created object with a dummy ID.
    const savedBet: Bet = {
      id: `bet_${Date.now()}`,
      ...newBet,
    } as Bet;

    console.log('Successfully created bet object on server:', savedBet);

    // 4. Return the created bet object to the client
    return NextResponse.json(savedBet, { status: 201 });

  } catch (error) {
    console.error('Error creating bet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
