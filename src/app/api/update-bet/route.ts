// src/app/api/update-bet/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid bet id' }, { status: 400 });
    }

    // Verify doc exists before updating so we surface a clear error
    const docRef = adminDb.collection('bettingLog').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: `Bet not found: ${id}` }, { status: 404 });
    }

    // ── Date conversion ────────────────────────────────────────────────────
    // Modal sends "YYYY-MM-DD" string; store as Firestore Timestamp
    if (updates.gameDate !== undefined && updates.gameDate !== null) {
      let dateObj: Date | null = null;

      if (typeof updates.gameDate === 'string') {
        // Append noon UTC so date-only strings don't shift across timezones
        const iso = updates.gameDate.includes('T')
          ? updates.gameDate
          : `${updates.gameDate}T12:00:00Z`;
        dateObj = new Date(iso);
      } else if (typeof updates.gameDate === 'number') {
        dateObj = new Date(updates.gameDate);
      } else if (updates.gameDate?.seconds !== undefined) {
        // Already a Timestamp shape — convert and skip
        updates.gameDate = Timestamp.fromMillis(updates.gameDate.seconds * 1000);
        dateObj = null;
      }

      if (dateObj !== null && !isNaN(dateObj.getTime())) {
        updates.gameDate = Timestamp.fromDate(dateObj);
      }
    }

    // ── Numeric coercion ───────────────────────────────────────────────────
    if (updates.stake !== undefined) {
      updates.stake = parseFloat(String(updates.stake)) || 0;
    }
    if (updates.cashedOutAmount !== undefined) {
      updates.cashedOutAmount = parseFloat(String(updates.cashedOutAmount)) || 0;
    }

    // Strip undefined values — Firestore rejects them
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await docRef.update({
      ...cleanUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUT /api/update-bet]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Unexpected server error' },
      { status: 500 }
    );
  }
}