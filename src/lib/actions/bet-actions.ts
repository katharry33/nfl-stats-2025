'use server';

import { adminDb } from '@/lib/firebase/admin';
import { Bet } from "../types";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface BetSubmissionResult {
  success: boolean;
  betId?: string;
  error?: string;
}

/**
 * FETCH ALL BETS (Admin SDK)
 */
export async function getBets(): Promise<any[]> {
  try {
    const snapshot = await adminDb.collection('bettingLog').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    throw new Error('Failed to fetch bets');
  }
}

/**
 * ADD OR UPDATE BET (Admin SDK)
 */
export async function addBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    // Use the existing ID if editing, otherwise generate a new one
    const betId = betData.id || db.collection('bettingLog').doc().id;
    const betRef = db.collection('bettingLog').doc(betId);

    const payload: any = {
      ...betData,
      id: betId,
      // We keep the fields in the DB for data integrity, 
      // but we don't block the request if they are missing.
      userId: userId || betData.userId || 'system_user',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!betData.id) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.status = betData.status || 'pending';
    }

    await betRef.set(payload, { merge: true });
    return { success: true, betId };
  } catch (error) {
    console.error('Error in addBet:', error);
    return { success: false, error: 'Failed to save bet' };
  }
}

/**
 * DELETE BET (Admin SDK)
 */
export async function deleteBet(betId: string): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    await db.collection('bettingLog').doc(betId).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting bet:', error);
    return { success: false, error: 'Failed to delete bet' };
  }
}