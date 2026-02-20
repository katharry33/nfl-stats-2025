// src/app/api/update-bet/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, propagateToLegs = false, ...updates } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid bet id' }, { status: 400 });
    }

    const docRef = adminDb.collection('bettingLog').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: `Bet not found: ${id}` }, { status: 404 });
    }

    // ── Date conversion ─────────────────────────────────────────────────────
    // Input is "YYYY-MM-DD" — parse as LOCAL noon so Feb 8 stays Feb 8.
    let gameDateTimestamp: Timestamp | null = null;
    if (updates.gameDate != null) {
      let dateObj: Date | null = null;

      if (typeof updates.gameDate === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.gameDate)) {
          // date-only string: parse as local noon to avoid UTC rollback
          const [y, m, d] = updates.gameDate.split('-').map(Number);
          dateObj = new Date(y, m - 1, d, 12, 0, 0);
        } else {
          const iso = updates.gameDate.includes('T')
            ? updates.gameDate
            : `${updates.gameDate}T12:00:00`;
          dateObj = new Date(iso);
        }
      } else if (typeof updates.gameDate === 'number') {
        dateObj = new Date(updates.gameDate);
      } else if (updates.gameDate?.seconds !== undefined) {
        updates.gameDate = Timestamp.fromMillis(updates.gameDate.seconds * 1000);
        dateObj = null;
      }

      if (dateObj && !isNaN(dateObj.getTime())) {
        gameDateTimestamp = Timestamp.fromDate(dateObj);
        updates.gameDate = gameDateTimestamp;
      }
    }

    // ── Numeric coercion ────────────────────────────────────────────────────
    if (updates.stake !== undefined) updates.stake = parseFloat(String(updates.stake)) || 0;
    if (updates.cashedOutAmount !== undefined) updates.cashedOutAmount = parseFloat(String(updates.cashedOutAmount)) || 0;
    if (updates.odds !== undefined) updates.odds = parseFloat(String(updates.odds)) || undefined;
    if (updates.week !== undefined) updates.week = parseInt(String(updates.week), 10) || undefined;
    if (updates.boost !== undefined) {
      const n = parseFloat(String(updates.boost));
      updates.boost = isNaN(n) ? updates.boost : n;
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await docRef.update({ ...cleanUpdates, updatedAt: FieldValue.serverTimestamp() });

    // ── Propagate gameDate to legs sub-documents if requested ───────────────
    // For parlays: update legs array embedded in the document
    if (propagateToLegs && gameDateTimestamp) {
      const data = docSnap.data() as any;
      if (Array.isArray(data?.legs) && data.legs.length > 0) {
        const updatedLegs = data.legs.map((leg: any) => ({
          ...leg,
          gameDate: gameDateTimestamp,
        }));
        await docRef.update({ legs: updatedLegs });
      }

      // Also find any sibling docs sharing the same parlayid
      const parlayId = data?.parlayid;
      if (parlayId) {
        const siblings = await adminDb
          .collection('bettingLog')
          .where('parlayid', '==', parlayId)
          .get();

        const batch = adminDb.batch();
        siblings.docs.forEach(sibling => {
          if (sibling.id !== id) {
            batch.update(sibling.ref, {
              gameDate: gameDateTimestamp,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        });
        if (!siblings.empty) await batch.commit();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUT /api/update-bet]', error);
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 500 });
  }
}