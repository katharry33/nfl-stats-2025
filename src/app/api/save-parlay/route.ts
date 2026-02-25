import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore"; // Use Admin FieldValue

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Destructure with defaults to prevent 'undefined' values
    const { stake = 0, legs = [], parlayResults = { totalOdds: 0, payout: 0 }, userId = 'anonymous' } = body;

    if (!legs || legs.length === 0) {
      return NextResponse.json({ error: "No legs in parlay" }, { status: 400 });
    }

    const db = getAdminDb();
    
    // Using 'bettingLog' to match your Firestore screenshot and Rules
    const parlayRef = db.collection("bettingLog").doc();
    
    const parlayData = {
      id: parlayRef.id,
      userId: userId,
      type: 'parlay',
      stake: Number(stake),
      totalOdds: Number(parlayResults.totalOdds),
      potentialPayout: Number(parlayResults.payout),
      status: 'pending',
      // Better to use ServerTimestamp for consistency in Firestore
      createdAt: FieldValue.serverTimestamp(), 
      legs: legs.map((leg: any) => ({
        // Explicit mapping to avoid passing 'undefined' fields
        player: leg.player || leg.Player || "N/A",
        prop: leg.prop || leg.Prop || "N/A",
        line: Number(leg.line) || 0,
        odds: Number(leg.odds) || 0,
        selection: leg.selection || "Over",
        matchup: leg.matchup || leg.Matchup || "N/A",
        playerteam: leg.playerteam || leg.Team || "N/A",
        parlayid: leg.parlayid || parlayRef.id // Link legs to the parent ID
      }))
    };

    await parlayRef.set(parlayData);

    return NextResponse.json({ success: true, id: parlayRef.id });
  } catch (error: any) {
    console.error("Save Parlay Error:", error);
    // Return a clearer error message for debugging
    return NextResponse.json({ 
      error: error.message, 
      details: "Check for undefined values in the legs array" 
    }, { status: 500 });
  }
}