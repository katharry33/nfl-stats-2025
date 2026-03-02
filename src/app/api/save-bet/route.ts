import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    console.log('Incoming Payload:', JSON.stringify(body, null, 2));
    const { id, legs, ...betData } = body;

    // 1. CALCULATE AGGREGATE STATUS (The "All Must Win" Rule)
    const hasLost = legs?.some((l: any) => l.status.toLowerCase() === 'lost');
    const allWon = legs?.every((l: any) => l.status.toLowerCase() === 'won');
    const parlayStatus = hasLost ? 'lost' : (allWon ? 'won' : 'pending');

    // 2. SANITIZE LEGS (Force Numbers & Types)
    const sanitizedLegs = legs?.map((leg: any) => ({
      ...leg,
      line: Number(leg.line) || 0,
      odds: Number(leg.odds) || 0,
      status: (leg.status || 'pending') as 'pending' | 'won' | 'lost' | 'void',
      selection: leg.selection as 'Over' | 'Under'
    })) || [];

    // 3. PERSIST TO PROPS LIBRARY
    if (sanitizedLegs.length > 0) {
      const propLibrary = adminDb.collection('allProps_2025');
      const propPromises = sanitizedLegs.map((leg: any) => {
        if (!leg.player || !leg.prop) return Promise.resolve();
        const propId = `${leg.player}-${leg.prop}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        
        return propLibrary.doc(propId).set({
          ...leg,
          lastUsed: new Date().toISOString(),
          isManual: true
        }, { merge: true });
      });
      await Promise.all(propPromises);
    }

    // 4. PREPARE FINAL DATA
    const finalData = {
      ...betData,
      legs: sanitizedLegs,
      status: parlayStatus, // Overwrites status with parlay logic
      userId: authId
    };

    // 5. SAVE THE BET
    if (id) {
      await adminDb.collection('user_bets').doc(id).set({
        ...finalData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return NextResponse.json({ success: true, status: parlayStatus });
    } else {
      const newDoc = await adminDb.collection('user_bets').add({
        ...finalData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, id: newDoc.id, status: parlayStatus });
    }

  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
