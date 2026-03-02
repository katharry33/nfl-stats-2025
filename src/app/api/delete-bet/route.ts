import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const db = adminDb;
    const betRef = db.collection('bettingLog').doc(id);
    const doc = await betRef.get();

    if (!doc.exists) {
      // If the specific document doesn't exist, check if the ID passed was actually a parlayId
      return await deleteByParlayId(db, id);
    }

    const data = doc.data();
    const parlayId = data?.parlayId || data?.parlayid;

    // If it's part of a parlay, we delete ALL legs associated with that parlayId
    if (parlayId) {
      return await deleteByParlayId(db, parlayId);
    }

    // Otherwise, it's just a single bet
    await betRef.delete();
    return NextResponse.json({ success: true, message: 'Deleted single bet' });

  } catch (error: any) {
    console.error('❌ DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to batch delete all legs
async function deleteByParlayId(db: any, pId: string) {
  const batch = db.batch();
  
  // Query for both casing possibilities
  let snap = await db.collection('bettingLog').where('parlayId', '==', pId).get();
  if (snap.empty) {
    snap = await db.collection('bettingLog').where('parlayid', '==', pId).get();
  }

  if (snap.empty) {
    return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
  }

  snap.docs.forEach((doc: any) => batch.delete(doc.ref));
  await batch.commit();

  return NextResponse.json({
    success: true,
    message: `Deleted parlay with ${snap.size} legs`,
  });
}