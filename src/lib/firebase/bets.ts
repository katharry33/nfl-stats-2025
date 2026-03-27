'use server';

import { adminDb } from '@/lib/firebase/admin';
import type { Bet } from '../types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Optional global logs (admin only)
const getGlobalCol = (sport?: string) =>
  sport === 'nba' ? 'bettingLogNba_2025' : 'bettingLog';

// User-scoped path
const userBetRef = (userId: string, betId: string) =>
  adminDb.collection('users').doc(userId).collection('bets').doc(betId);

// ─────────────────────────────────────────────
// GET BETS (user-scoped)
// ─────────────────────────────────────────────
export async function getBets(userId: string): Promise<Bet[]> {
  try {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('bets')
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt,
      } as Bet;
    });
  } catch (error) {
    console.error('Error fetching user bets:', error);
    throw new Error('Failed to fetch bets');
  }
}

// ─────────────────────────────────────────────
// ADD / UPDATE BET (user-scoped)
// ─────────────────────────────────────────────
export async function addBet(
  userId: string,
  betData: Partial<Bet>,
  sport?: string,
  logGlobally = false
) {
  try {
    const betId = betData.id || adminDb.collection('tmp').doc().id;
    const ref = userBetRef(userId, betId);

    const payload: any = {
      ...betData,
      id: betId,
      userId,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!betData.id) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.status = betData.status || 'pending';
    }

    await ref.set(payload, { merge: true });

    // Optional: also write to global logs for admin analytics
    if (logGlobally) {
      await adminDb.collection(getGlobalCol(sport)).doc(betId).set(payload, { merge: true });
    }

    return { success: true, betId };
  } catch (error) {
    console.error('Error saving bet:', error);
    return { success: false, error: 'Failed to save bet' };
  }
}

// ─────────────────────────────────────────────
// DELETE BET (user-scoped)
// ─────────────────────────────────────────────
export async function deleteBet(userId: string, betId: string, sport?: string) {
  try {
    await userBetRef(userId, betId).delete();

    // Optional: also delete from global logs
    if (sport) {
      await adminDb.collection(getGlobalCol(sport)).doc(betId).delete();
    }

    return { success: true };
  } catch (error) {
    console.error('Delete failed:', error);
    return { success: false, error: 'Delete failed' };
  }
}
