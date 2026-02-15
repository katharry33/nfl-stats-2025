import { db } from '@/lib/firebase/admin';
import { Bet } from "../../types";
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Add a bet to Firestore (server-side)
 * Used by API routes
 */
export async function addBet(userId: string, betData: Partial<Bet>): Promise<string> {
  try {
    const betRef = await db.collection('betintgLog').add({
      ...betData,
      userId,
      createdAt: FieldValue.serverTimestamp(),
      status: betData.status || 'pending',
    });
    
    return betRef.id;
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
  status: Bet['status']
): Promise<void> {
  try {
    await db.collection('bettingLog').doc(betId).update({
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
    const doc = await db.collection('bettingLog').doc(betId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    } as Bet;
  } catch (error) {
    console.error('Error fetching bet:', error);
    return null;
  }
}