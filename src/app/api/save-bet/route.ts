import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { auth } from '@clerk/nextjs/server';
import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { id, legs, gameDate, ...betData } = body;

    if (!id) return new NextResponse('Missing Bet ID', { status: 400 });

    // 1. Fix the Date: Prevent "Sept 4" from becoming "Sept 3"
    let finalDate = Timestamp.now();
    if (gameDate) {
      const d = new Date(gameDate);
      if (!isNaN(d.getTime())) {
        // Offset correction for local-to-UTC conversion
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        finalDate = Timestamp.fromDate(d);
      }
    }

    // 2. Prepare the flat data for the 'bettingLog' collection
    const finalData = {
      ...betData,
      legs: legs || [],
      userId: authId,
      gameDate: finalDate,
      updatedAt: Timestamp.now(),
    };

    const logCollection = adminDb.collection('bettingLog');

    // 3. Perform the Update
    // Using .set with merge: true ensures we don't wipe out fields like 'createdAt'
    await logCollection.doc(id).set(finalData, { merge: true });

    // 4. Batch update siblings if it's a parlay
    // This ensures changing the date on one leg updates the entire parlay
    if (betData.parlayId) {
      const siblings = await logCollection.where('parlayId', '==', betData.parlayId).get();
      const batch = adminDb.batch();
      
      siblings.docs.forEach(doc => {
        if (doc.id !== id) {
          batch.update(doc.ref, { 
            gameDate: finalDate, 
            status: betData.status,
            updatedAt: Timestamp.now() 
          });
        }
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}