'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * useFirebaseBets
 * Handles CRUD operations for the betting log via the /api/betting-log endpoint.
 */
export function useFirebaseBets(userId: string) {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  // This must match your src/app/api/betting-log folder name
  const API_PATH = '/api/betting-log';

  const fetchBets = useCallback(async (
    search: any = '',
    week: string = 'all',
  ) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '500' });
      
      // Safety: Ensure search is a string before trimming
      const searchStr = typeof search === 'string' ? search : '';
      if (searchStr.trim()) {
        params.set('player', searchStr.trim().toLowerCase());
      }
      
      if (week && week !== 'all') params.set('week', week);

      const res = await fetch(`${API_PATH}?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      setBets(data.bets ?? []);
    } catch (err: any) {
      console.error('[useBets] fetch error:', err);
      setError(err?.message ?? 'Failed to load bets');
      setBets([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  /**
   * updateBet: Merges updates into an existing bet (Optimistic UI)
   */
  const updateBet = useCallback(async (updates: any) => {
    const id = updates.id;
    if (!id) throw new Error('updateBet: missing id');

    // 1. Optimistic UI Update
    setBets(prev => prev.map(b => {
      if (b.id !== id) return b;
      
      // Merge legs and ensure gameDate consistency
      const mergedLegs = (updates.legs ?? b.legs ?? []).map((leg: any) => ({
        ...leg,
        gameDate: updates.gameDate ?? leg.gameDate,
      }));

      return { ...b, ...updates, legs: mergedLegs };
    }));

    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...updates, userId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Save failed');
      }
    } catch (err) {
      console.error('[useBets] update error:', err);
      fetchBets(); // Rollback/Refresh on failure to sync with DB
      throw err;
    }
  }, [userId, fetchBets]);

  /**
   * deleteBet: Removes a bet by ID (Optimistic UI)
   */
  const deleteBet = useCallback(async (id: string) => {
    // 1. Optimistic UI Update
    setBets(prev => prev.filter(b => b.id !== id));

    try {
      const params = new URLSearchParams({ id, userId });
      const res = await fetch(`${API_PATH}?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Delete failed');
      }
    } catch (err) {
      console.error('[useBets] delete error:', err);
      fetchBets(); // Refresh on failure
      throw err;
    }
  }, [userId, fetchBets]);

  return { 
    bets, 
    setBets, 
    loading, 
    error, 
    fetchBets, 
    updateBet, 
    deleteBet,
    refresh: () => fetchBets() 
  };
}