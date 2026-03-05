'use server';

// src/lib/actions/bet-actions.ts
import { adminDb } from '@/lib/firebase/admin';
import { Bet } from "../types";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface BetSubmissionResult {
  success: boolean;
  betId?: string;
  error?: string;
}

export async function addBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    
    let createdAt;
    const betDate = betData.gameDate || betData.createdAt; // Use correct properties

    if (betDate) {
      // new Date() is robust and can parse ISO strings, date strings, and Date objects
      const d = new Date(betDate as any); 
      if (!isNaN(d.getTime())) {
        // Preserve original logic of setting time to midday to avoid timezone issues
        d.setHours(12, 0, 0, 0);
        createdAt = Timestamp.fromDate(d);
      } else {
        createdAt = FieldValue.serverTimestamp();
      }
    } else {
      createdAt = FieldValue.serverTimestamp();
    }
    
    const betRef = await db.collection('bettingLog').add({
      ...betData,
      userId,
      uid: userId,
      createdAt,
      status: betData.status || 'pending',
    });
    
    return { success: true, betId: betRef.id };
  } catch (error) {
    console.error('Error adding bet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add bet';
    return { success: false, error: errorMessage };
  }
}

export async function submitBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  return addBet(userId, betData);
}

export async function updateBetStatus(
  betId: string, 
  status: Bet['status']
): Promise<void> {
  try {
    const db = adminDb;
    await db.collection('bettingLog').doc(betId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating bet status:', error);
    throw new Error('Failed to update bet status');
  }
}

export async function deleteBet(betId: string): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    
    // Try to delete from all collections
    const collections = ['bettingLog', '2025_bets', 'bets'];
    
    for (const collection of collections) {
      const docRef = db.collection(collection).doc(betId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        await docRef.delete();
        return { success: true };
      }
    }
    
    return { success: false, error: 'Bet not found' };
  } catch (error) {
    console.error('Error deleting bet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete bet';
    return { success: false, error: errorMessage };
  }
}

export async function getBetById(betId: string): Promise<Bet | null> {
  try {
    const db = adminDb;
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
