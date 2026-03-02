import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const db = adminDb;
  const betRef = db.collection('bettingLog').doc(id);

  try {
    const doc = await betRef.get();

    // Case 1: It's a single bet (document exists with the ID)
    if (doc.exists) {
      await betRef.delete();
      return NextResponse.json({ success: true, message: 'Deleted single bet' });
    }

    // Case 2: It's a parlay (no single doc, but legs have parlayId)
    // The ID passed is a parlayId.
    const batch = db.batch();
    let parlayQuery = db.collection('bettingLog').where('parlayId', '==', id);
    let parlayQuerySnapshot = await parlayQuery.get();

    // Try with 'parlayid' (lowercase i) as well
    if (parlayQuerySnapshot.empty) {
      parlayQuery = db.collection('bettingLog').where('parlayid', '==', id);
      parlayQuerySnapshot = await parlayQuery.get();
    }

    if (parlayQuerySnapshot.empty) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }

    // Add all legs to the batch for deletion
    parlayQuerySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Deleted parlay with ${parlayQuerySnapshot.size} legs`,
    });
  } catch (error: any) {
    console.error('❌ DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
