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
 * Handles both Creating and Updating bets.
 * Using .set with { merge: true } prevents duplicate documents on edit.
 */
export async function addBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    
    // 1. Determine the ID: Use existing or generate a new one
    const betId = betData.id || db.collection('bettingLog').doc().id;
    const betRef = db.collection('bettingLog').doc(betId);

    // 2. Handle Timestamps
    let createdAt = betData.createdAt;
    const betDate = betData.gameDate || betData.createdAt;

    if (betDate && !(betDate instanceof Timestamp)) {
      const d = new Date(betDate as any);
      if (!isNaN(d.getTime())) {
        d.setHours(12, 0, 0, 0);
        createdAt = Timestamp.fromDate(d);
      }
    }
    
    // If it's a brand new bet and we still don't have a createdAt
    if (!betData.id && !createdAt) {
      createdAt = FieldValue.serverTimestamp();
    }

    // 3. Prepare Payload
    const payload = {
      ...betData,
      id: betId,
      userId,
      uid: userId, // Keeping both for compatibility
      updatedAt: FieldValue.serverTimestamp(),
      status: betData.status || 'pending',
    };

    // Only include createdAt if we actually defined it (don't overwrite on update if missing)
    if (createdAt) (payload as any).createdAt = createdAt;

    // 4. Save with Merge
    await betRef.set(payload, { merge: true });
    
    return { success: true, betId };
  } catch (error) {
    console.error('Error adding/updating bet:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save bet' };
  }
}

// Alias for semantic clarity in the UI
export async function submitBet(userId: string, betData: Partial<Bet>): Promise<BetSubmissionResult> {
  return addBet(userId, betData);
}

/**
 * Standardized Delete
 */
export async function deleteBet(betId: string): Promise<BetSubmissionResult> {
  try {
    const db = adminDb;
    
    // Standard collection first
    const mainRef = db.collection('bettingLog').doc(betId);
    const mainDoc = await mainRef.get();
    
    if (mainDoc.exists) {
      await mainRef.delete();
      return { success: true };
    }

    // Fallback for legacy collections
    const legacyCollections = ['2025_bets', 'bets'];
    for (const col of legacyCollections) {
      const ref = db.collection(col).doc(betId);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.delete();
        return { success: true };
      }
    }
    
    return { success: false, error: 'Bet not found' };
  } catch (error) {
    console.error('Error deleting bet:', error);
    return { success: false, error: 'Internal server error during deletion' };
  }
}

/**
 * Fetch a single bet
 */
export async function getBetById(betId: string): Promise<Bet | null> {
  try {
    const doc = await adminDb.collection('bettingLog').doc(betId).get();
    if (!doc.exists) return null;
    
    return { id: doc.id, ...doc.data() } as Bet;
  } catch (error) {
    console.error('Error fetching bet:', error);
    return null;
  }
}