// src/app/api/bets/place/route.ts
import { NextResponse } from 'next/server';
import { Bet, BetLeg, BetType } from '@/lib/types';
import { americanToDecimal, decimalToAmerican } from '@/lib/utils';

// This would be your real database client for saving the data
// import { adminDb } from '@/lib/firebase/server/admin';

/**
 * Handles the submission of a new bet from the client's bet slip.
 * The client only sends the legs; the server is responsible for all
 * business logic, validation, and data enrichment.
 */
export async function POST(request: Request) {
  try {
    const { legs } = (await request.json()) as { legs: BetLeg[] };

    if (!legs || legs.length === 0) {
      return NextResponse.json({ error: 'No legs provided' }, { status: 400 });
    }

    // --- Server-Side Logic & Enrichment ---

    // 1. Determine BetType
    const betType: BetType = legs.length === 1 ? 'straight' : 'parlay';

    // 2. Calculate Total Odds (must be done on the server for security)
    const totalDecimalOdds = legs.reduce((total, leg) => {
      // Ensure the odds are in a consistent format before calculating
      return total * americanToDecimal(leg.odds);
    }, 1);
    const finalAmericanOdds = decimalToAmerican(totalDecimalOdds);

    // 3. Define Stake and Payout (server-controlled)
    const stake = 10; // Default stake, could be passed from client if trusted
    const potentialPayout = stake * totalDecimalOdds;

    // 4. Construct the full, secure Bet object for the database
    const newBet: Omit<Bet, 'id'> = {
      // userId should be securely obtained from the user's session
      userId: "user-123", // Placeholder for actual user ID from auth
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      stake: stake,
      odds: finalAmericanOdds,
      potentialPayout: potentialPayout,
      legs: legs,
      betType: betType,
      boost: false, 
      boostPercentage: 0,
      isLive: false,
    };

    // 5. Save to Firestore (simulation)
    // const docRef = await adminDb.collection('user_bets').add(newBet);
    // const savedBet = { id: docRef.id, ...newBet };

    // For this simulation, we'll echo back the final object with a dummy ID.
    const savedBet: Bet = {
      id: `bet_${Date.now()}`,
      ...newBet,
    } as Bet;

    console.log('Successfully created bet on server:', savedBet);

    // 6. Return the created bet object to the client
    return NextResponse.json(savedBet, { status: 201 });

  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
