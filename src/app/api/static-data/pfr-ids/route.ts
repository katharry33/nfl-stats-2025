import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue, QuerySnapshot, DocumentData } from 'firebase-admin/firestore';

const COL = 'static_pfrIdMap';

export async function GET() {
  try {
    // 1. Define snap within the GET scope
    const snap: QuerySnapshot<DocumentData> = await adminDb
      .collection(COL)
      .orderBy('player') // Sorting by your DB field 'player'
      .get();

    // 2. Explicitly type 'd' to resolve the 'any' error
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[GET /api/static-data/pfr-ids]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, pfrId } = await req.json();

    if (!playerName?.trim() || !pfrId?.trim()) {
      return NextResponse.json({ error: 'playerName and pfrId required' }, { status: 400 });
    }

    // Saving using your specific DB field names: 'player' and 'pfrid'
    const ref = await adminDb.collection(COL).add({
      player: playerName.trim(),
      pfrid: pfrId.trim(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ... Keep your PUT and DELETE logic below, ensuring they use adminDb.collection(COL)

export async function PUT(req: NextRequest) {
  const { id, playerName, pfrId } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await adminDb.collection(COL).doc(id).update({
    playerName: playerName.trim(),
    pfrId:      pfrId.trim(),
    updatedAt:  FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await adminDb.collection(COL).doc(id).delete();
  return NextResponse.json({ success: true });
}