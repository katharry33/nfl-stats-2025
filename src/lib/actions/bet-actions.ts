'use server';

// src/lib/actions/bet-actions.ts
import { getAdminDb } from '@/lib/firebase/admin';
import { Bet } from "../types";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface BetSubmissionResult {
  success: boolean;
  betId?: string;
  error?: string;
}

export async function addBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  try {
    const db = getAdminDb();
    
    // Convert date string to Timestamp if provided
    let createdAt;
    if (betData.date) {
      const [year, month, day] = (betData.date as string).split('-').map(Number);
      createdAt = Timestamp.fromDate(new Date(year, month - 1, day, 12, 0, 0));
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
    const db = getAdminDb();
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
    const db = getAdminDb();
    
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
    const db = getAdminDb();
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
