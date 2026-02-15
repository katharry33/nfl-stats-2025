'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  or
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { submitBet, deleteBet as deleteBetAction } from '../lib/actions/bet-actions';
import { toast } from 'sonner';
import type { Bet } from '../lib/types';

export function useFirebaseBets(userId: string | undefined) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'bettingLog'), // Confirmed: This should be bettingLog
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const betsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Bet[];
        setBets(betsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching bettingLog:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const placeBet = async (betData: Partial<Bet>) => {
    if (!userId) {
      toast.error("Authentication required");
      return;
    }

    try {
      const result = await submitBet(userId, betData);
      
      if (result.success) {
        toast.success("Bet placed successfully!");
      } else {
        toast.error(result.error || "An unexpected error occurred");
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'An unknown error occurred.');
    }
  };

  const removeBet = async (betId: string) => {
    try {
      const result = await deleteBetAction(betId);
      if (result.success) {
        toast.success("Bet deleted successfully");
      } else {
        toast.error(result.error || "An unexpected error occurred");
      }
    } catch (err: any) {
      console.error("Failed to delete bet:", err);
      toast.error(err.message || 'Failed to delete bet.');
    }
  };

  return { 
    bets, 
    loading, 
    error, 
    placeBet, 
    deleteBet: removeBet 
  };
}
