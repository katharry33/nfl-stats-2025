import { NextResponse } from "next/server";
import { addBet } from "@/lib/firebase/server/bet-actions";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const betData = await req.json();
    const userId = "dev-user"; // TODO: Get from authenticated session
    const result = await addBet(userId, betData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("API Error: Failed to log bet", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}