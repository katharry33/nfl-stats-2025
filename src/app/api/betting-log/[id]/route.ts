import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getAdminDb();
    const body = await request.json();
    const { id } = params;

    const updateData: any = { ...body, updatedAt: Timestamp.now() };

    // FIX: Convert incoming string "YYYY-MM-DD" to Firestore Timestamp
    if (body.manualDate && typeof body.manualDate === 'string') {
      const dateValue = new Date(`${body.manualDate}T12:00:00`);
      updateData.manualDate = Timestamp.fromDate(dateValue);
    }

    // Search all collections to find where this bet lives
    const collections = ['bettingLog', '2025_bets', 'bets'];
    let updated = false;

    for (const col of collections) {
      const docRef = db.collection(col).doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update(updateData);
        updated = true;
        break;
      }
    }

    return NextResponse.json({ success: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}