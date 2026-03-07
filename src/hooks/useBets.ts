// src/hooks/useBets.ts
'use client';

import { useState, useCallback, useRef } from 'react';

const PAGE_SIZE = 50;

export function useFirebaseBets(userId: string) {
  const [bets, setBets]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const lastCursor                    = useRef<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchBets = useCallback(async (
    reset  = false,
    search = '',
    week   = 'all',
  ) => {
    if (reset) {
      setLoading(true);
      setError(null);
      lastCursor.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (search) params.set('player', search.trim().toLowerCase());
      if (week && week !== 'all') params.set('week', week);
      if (userId) params.set('userId', userId);
      if (!reset && lastCursor.current) params.set('cursor', lastCursor.current);

      const res = await fetch(`/api/betting-log?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      const incoming: any[] = data.bets ?? [];

      lastCursor.current = data.nextCursor ?? null;
      setHasMore(data.hasMore ?? false);
      setBets(prev => reset ? incoming : [...prev, ...incoming]);
    } catch (err: any) {
      console.error('[useBets] fetch error:', err);
      setError(err?.message ?? 'Failed to load bets');
      if (reset) setBets([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchBets(false);
  }, [fetchBets, loadingMore, hasMore]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateBet = useCallback(async (updates: any) => {
    const id = updates.id;
    if (!id) throw new Error('updateBet: missing id');

    // Optimistic update — sync gameDate into every leg so any display that
    // reads legs[0].gameDate also reflects the change immediately.
    setBets(prev => prev.map(b => {
      if (b.id !== id) return b;
      const mergedLegs = (updates.legs ?? b.legs ?? []).map((leg: any) => ({
        ...leg,
        gameDate: updates.gameDate ?? leg.gameDate,
      }));
      return { ...b, ...updates, legs: mergedLegs };
    }));

    try {
      const res = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...updates, userId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Save failed');
      }
      // Success — optimistic state is correct, no re-fetch needed.

    } catch (err) {
      console.error('[useBets] update error:', err);
      // Re-fetch only on failure to revert the optimistic update
      fetchBets(true);
      throw err;
    }
  }, [userId, fetchBets]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteBet = useCallback(async (id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));

    try {
      const params = new URLSearchParams({ id });
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/betting-log?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Delete failed');
      }
    } catch (err) {
      console.error('[useBets] delete error:', err);
      fetchBets(true);
      throw err;
    }
  }, [userId, fetchBets]);

  return {
    bets,
    setBets,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchBets,
    loadMore,
    updateBet,
    deleteBet,
    refresh: () => fetchBets(true),
  };
}