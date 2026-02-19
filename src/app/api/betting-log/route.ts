import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Bet ID is required" }, { status: 400 });
    }

    console.log(`📝 Updating bet ${id} with:`, updates);
    
    const db = getAdminDb();
    const betRef = db.collection('bettingLog').doc(id);

    const updatePayload: { [key: string]: any } = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    await betRef.update(updatePayload);
    
    console.log(`✅ Bet ${id} updated successfully.`);
    
    return NextResponse.json({ success: true, message: 'Bet updated' }, { status: 200 });

  } catch (error: any) {
    console.error("❌ API Error: Failed to update bet", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const betData = await req.json();
    const userId = betData.userId || "dev-user";
    
    console.log('📝 Saving bet to bettingLog:', betData);
    
    const db = getAdminDb();
    
    const betDoc = {
      ...betData,
      userId,
      uid: userId,
      createdAt: betData.createdAt ? new Date(betData.createdAt) : FieldValue.serverTimestamp(),
      status: betData.status || 'pending',
    };
    
    const betRef = await db.collection('bettingLog').add(betDoc);
    
    console.log('✅ Bet saved with ID:', betRef.id);
    
    return NextResponse.json({ 
      success: true, 
      betId: betRef.id,
      message: 'Bet saved successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("❌ API Error: Failed to save bet", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    // FIX: Pointing to the correct 'bettingLog' collection
    const snapshot = await db.collection('bettingLog')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const bets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure timestamps are converted to ISO strings for client-side consistency
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
      };
    });

    return NextResponse.json({ bets });
  } catch (error) {
    console.error('Error fetching from bettingLog:', error);
    return NextResponse.json({ error: 'Failed to fetch betting log' }, { status: 500 });
  }
}
