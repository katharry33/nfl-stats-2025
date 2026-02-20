// src/hooks/useBets.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, deleteDoc, doc, updateDoc, serverTimestamp,
  DocumentSnapshot, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

const PAGE_SIZE = 50;

export function useFirebaseBets(userId: string) {
  const [bets, setBets]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  const fetchBets = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      lastDocRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      // Build query — paginate with startAfter cursor
      let q = query(
        collection(db, 'bettingLog'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (!reset && lastDocRef.current) {
        q = query(
          collection(db, 'bettingLog'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocRef.current),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newBets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Update cursor for next page
      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      // If we got fewer than PAGE_SIZE, there are no more pages
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      setBets(prev => reset ? newBets : [...prev, ...newBets]);
    } catch (err) {
      console.error('[useFirebaseBets] fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchBets(true);
  }, [fetchBets]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchBets(false);
  }, [fetchBets, loadingMore, hasMore]);

  const deleteBet = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bettingLog', id));
      setBets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('[useFirebaseBets] delete error:', err);
    }
  }, []);

  const updateBet = useCallback(async (updates: any) => {
    const { id, ...rest } = updates;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'bettingLog', id), {
        ...rest,
        updatedAt: serverTimestamp(),
      });
      // Optimistically update local state so UI refreshes immediately
      setBets(prev => prev.map(b => b.id === id ? { ...b, ...rest } : b));
    } catch (err) {
      console.error('[useFirebaseBets] update error:', err);
      throw err; // re-throw so modal can catch it
    }
  }, []);

  return {
    bets,
    loading,
    loadingMore,
    hasMore,
    deleteBet,
    updateBet,
    loadMore,
    refresh: () => fetchBets(true),
  };
}