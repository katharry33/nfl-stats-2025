// src/hooks/useBets.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, updateDoc, doc, serverTimestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

const PAGE_SIZE = 50;
const COLLECTION_NAME = 'betting_logs';

export function useFirebaseBets(userId: string) {
  const [bets, setBets]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  const fetchBets = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setError(null);
      lastDocRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      let snapshot;

      // Primary query: ordered by createdAt desc
      try {
        let q = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        if (!reset && lastDocRef.current) {
          q = query(
            collection(db, COLLECTION_NAME),
            orderBy('createdAt', 'desc'),
            startAfter(lastDocRef.current),
            limit(PAGE_SIZE)
          );
        }

        snapshot = await getDocs(q);
      } catch (orderErr) {
        // Fallback: if orderBy fails (mixed types / missing index), fetch without ordering
        console.warn('[useFirebaseBets] orderBy failed, falling back to unordered fetch:', orderErr);
        const fallback = query(collection(db, COLLECTION_NAME), limit(PAGE_SIZE));
        snapshot = await getDocs(fallback);
      }

      const newBets = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, 
          player: data.player || data.Player || 'N/A',
          prop: data.prop || data.Prop || 'N/A',
          line: data.line || data.Line,
          odds: data.odds || data.Odds,
          status: data.status || 'pending',
          parlayId: data.parlayid || null, 
          ...data,
          _sortMs: (() => {
            const v = data.createdAt;
            if (!v) return 0;
            if (typeof v === 'string') return new Date(v).getTime();
            if (v?.seconds) return v.seconds * 1000;
            if (v instanceof Date) return v.getTime();
            return 0;
          })(),
        }
      });

      // Sort client-side as safety net regardless of which query path ran
      newBets.sort((a, b) => b._sortMs - a._sortMs);

      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setBets(prev => reset ? newBets : [...prev, ...newBets]);
    } catch (err: any) {
      console.error('[useFirebaseBets] fetch error:', err);
      setError(err?.message ?? 'Failed to load bets');
      setBets([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBets(true);
  }, [fetchBets]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchBets(false);
  }, [fetchBets, loadingMore, hasMore]);

  // ── Delete via admin API (bypasses Firestore client security rules) ──────
  const deleteBet = useCallback(async (id: string) => {
    // Optimistic update — remove from UI immediately
    setBets(prev => prev.filter(b => b.id !== id));
    try {
      const res = await fetch(`/api/betting-log?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Delete failed');
      }
    } catch (err) {
      console.error('[useFirebaseBets] delete error:', err);
      // Restore state on failure by re-fetching
      fetchBets(true);
      throw err;
    }
  }, [fetchBets]);

  // ── Update via client SDK ─────────────────────────────────────────────────
  const updateBet = useCallback(async (updates: any) => {
    const { id, ...rest } = updates;
    if (!id) return;
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...rest,
        updatedAt: serverTimestamp(),
      });
      setBets(prev => prev.map(b => b.id === id ? { ...b, ...rest } : b));
    } catch (err) {
      console.error('[useFirebaseBets] update error:', err);
      throw err;
    }
  }, []);

  return {
    bets,
    loading,
    loadingMore,
    hasMore,
    error,
    deleteBet,
    updateBet,
    loadMore,
    refresh: () => fetchBets(true),
  };
}
