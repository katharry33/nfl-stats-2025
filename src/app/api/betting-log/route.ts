import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getBettingLog } from "@/lib/firebase/server/queries";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This function now handles the 'parlayid' grouping logic
    const bets = await getBettingLog(userId);
    return NextResponse.json(bets);
  } catch (error) {
    console.error("Failed to fetch betting log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
