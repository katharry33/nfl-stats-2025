import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { id, totalOdds } = await request.json();
    const db = getAdminDb();
    
    // Specifically target the document by ID in the bettingLog collection
    await db.collection('bettingLog').doc(id).update({
      TotalOdds: totalOdds,
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Firestore Update Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}