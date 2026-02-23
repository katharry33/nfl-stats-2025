import { NextRequest, NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase/admin';

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    // 🚩 CRITICAL: Convert string date from modal to Timestamp
    if (updates.gameDate && typeof updates.gameDate === 'string') {
      const dateObj = new Date(updates.gameDate);
      // Ensure it's a valid date before converting
      if (!isNaN(dateObj.getTime())) {
        updates.gameDate = admin.firestore.Timestamp.fromDate(dateObj);
      }
    }

    await adminDb.collection('bettingLog').doc(id).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}