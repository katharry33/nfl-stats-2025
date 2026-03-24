'use server';

import { adminDb } from '@/lib/firebase/admin';
import { Bet } from "../types";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Helper to get correct collection name
const getCol = (sport?: string) => sport === 'nba' ? 'bettingLogNba_2025' : 'bettingLog';

export async function getBets(sport?: string): Promise<any[]> {
  try {
    const snapshot = await adminDb.collection(getCol(sport)).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    throw new Error('Failed to fetch bets');
  }
}

export async function addBet(userId: string, betData: Partial<Bet>, sport?: string) {
  try {
    const db = adminDb;
    const betId = betData.id || db.collection(getCol(sport)).doc().id;
    const betRef = db.collection(getCol(sport)).doc(betId);

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

    await betRef.set(payload, { merge: true });
    return { success: true, betId };
  } catch (error) {
    console.error('Error saving bet:', error);
    return { success: false, error: 'Failed to save' };
  }
}

export async function deleteBet(betId: string, sport?: string) {
  try {
    await adminDb.collection(getCol(sport)).doc(betId).delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Delete failed' };
  }
}