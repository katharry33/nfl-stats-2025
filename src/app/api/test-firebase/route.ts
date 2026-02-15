import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = adminDb;
    const testDoc = await db.collection("system").doc("status").get();
    
    return NextResponse.json({ 
      success: true, 
      data: testDoc.exists ? testDoc.data() : "No status doc found" 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}