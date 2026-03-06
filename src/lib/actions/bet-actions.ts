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

export async function saveBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    
    const dataToSave: { [key: string]: any } = { ...betData };

    dataToSave.userId = userId;
    dataToSave.uid = userId;
    dataToSave.status = dataToSave.status || 'pending';
    dataToSave.createdAt = FieldValue.serverTimestamp();
    dataToSave.updatedAt = FieldValue.serverTimestamp();

    if (dataToSave.gameDate) {
      const d = new Date(dataToSave.gameDate as any);
      if (!isNaN(d.getTime())) {
        d.setHours(12, 0, 0, 0);
        dataToSave.gameDate = Timestamp.fromDate(d);
      } else {
        delete dataToSave.gameDate;
      }
    }
    
    if ('id' in dataToSave) {
        delete dataToSave.id;
    }

    const betRef = await db.collection('bettingLog').add(dataToSave);
    
    return { success: true, betId: betRef.id };
  } catch (error) {
    console.error('Error saving bet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save bet';
    return { success: false, error: errorMessage };
  }
}


export async function addBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  return saveBet(userId, betData);
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
