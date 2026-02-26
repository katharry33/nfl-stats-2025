import { adminDb } from '@/lib/firebase/admin';
import { Bet } from '../../types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Add a bet to Firestore (server-side)
 */
export async function addBet(
  userId: string,
  betData: Partial<Bet>,
): Promise<{ id: string } & Partial<Bet>> {
  try {
    const dataToSave = {
      ...betData,
      userId,
      createdAt: FieldValue.serverTimestamp(),
      status: betData.status || 'pending',
    };
    const betRef = await adminDb.collection('bettingLog').add(dataToSave);

    return {
      id: betRef.id,
      ...betData,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error adding bet:', error);
    throw new Error('Failed to add bet');
  }
}

/**
 * Update bet status (server-side)
 */
export async function updateBetStatus(
  betId: string,
  status: Bet['status'],
): Promise<void> {
  try {
    await adminDb.collection('bettingLog').doc(betId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating bet status:', error);
    throw new Error('Failed to update bet status');
  }
}

/**
 * Get a single bet by ID (server-side)
 */
export async function getBetById(betId: string): Promise<Bet | null> {
  try {
    const doc = await adminDb.collection('bettingLog').doc(betId).get();
    if (!doc.exists) return null;

    const data = doc.data();

    // The returned object doesn't fully satisfy Bet at compile time because
    // Firestore data is untyped — cast via unknown to avoid the TS2352 error.
    return {
      id:        doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: data?.updatedAt?.toDate?.().toISOString() ?? null,
    } as unknown as Bet;
  } catch (error) {
    console.error('Error fetching bet:', error);
    return null;
  }
}

/**
 * Delete a bet by ID (server-side)
 */
export async function deleteBet(id: string) {
  return adminDb.collection('bettingLog').doc(id).delete();
}