'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { submitBet, deleteBet as deleteBetAction } from '../lib/actions/bet-actions';
import { toast } from 'sonner';
import type { Bet } from '../lib/types';

const BETS_PER_PAGE = 20;

interface BetUpdatePayload {
  id: string;
  status?: string;
  stake?: number;
  manualDate?: string | Date;
  cashedOutAmount?: number;
}

export function useFirebaseBets(userId: string | undefined) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const unsubscribeRef = useRef<() => void | undefined>();

  useEffect(() => {
    if (!userId) {
      setBets([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    setLoading(true);

    const q = query(
      collection(db, 'bettingLog'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(BETS_PER_PAGE)
    );

    unsubscribeRef.current = onSnapshot(q, 
      (snapshot) => {
        const betsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bet[];
        setBets(betsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BETS_PER_PAGE);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching bettingLog:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
  }, [userId]);

  const loadMore = async () => {
    if (!userId || !lastVisible || !hasMore) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'bettingLog'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(BETS_PER_PAGE)
      );

      const documentSnapshots = await getDocs(q);
      const newBets = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bet[];

      setBets(prevBets => [...prevBets, ...newBets]);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(documentSnapshots.docs.length === BETS_PER_PAGE);

    } catch (err) {
      console.error("Failed to load more bets:", err);
      setError(err as Error);
    } finally {
      setLoadingMore(false);
    }
  };

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

  const updateBet = async (updates: BetUpdatePayload) => {
    try {
      const payload: { [key: string]: any } = { ...updates };
      if (payload.manualDate && payload.manualDate instanceof Date) {
        payload.manualDate = payload.manualDate.toISOString();
      }
      const res = await fetch('/api/betting-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Bet updated successfully");
      } else {
        throw new Error(result.error || "Failed to update bet");
      }
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update bet");
    }
  };

  return { 
    bets, 
    loading, 
    error, 
    placeBet, 
    deleteBet: removeBet,
    updateBet,
    loadMore,
    hasMore,
    loadingMore
  };
}
