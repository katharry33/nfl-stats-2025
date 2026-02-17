import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const betData = await request.json();
    
    // Create a Batch to ensure all legs are saved together
    const batch = adminDb.batch();
    const parlayId = `PL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // If it's a parlay, we save each leg as its own doc to match legacy 'parlayid' logic
    betData.legs.forEach((leg: any) => {
      const docRef = adminDb.collection('user_bets').doc();
      batch.set(docRef, {
        ...leg,
        userId,
        parlayid: betData.legs.length > 1 ? parlayId : null,
        bettype: betData.betType,
        stake: betData.stake,
        createdAt: new Date().toISOString(),
        result: 'pending' // Matches legacy 'result' field
      });
    });

    await batch.commit();
    return NextResponse.json({ success: true, parlayId });
  } catch (error) {
    console.error("Bet placement failed:", error);
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 });
  }
}
