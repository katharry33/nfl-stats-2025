// src/hooks/useBets.ts
'use client';
import { useState, useCallback, useRef } from 'react';

export function useFirebaseBets(userId: string) {
  const [bets, setBets]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const isFetching            = useRef(false);

  // Fetch ALL bets at once (limit 500 — well within the ~128 count).
  // Client-side sorting/filtering/pagination lives in BetsTable.
  const fetchBets = useCallback(async (
    _reset = true,        // kept for API compatibility, always resets
    search = '',
    week   = 'all',
  ) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '500' });
      if (search) params.set('player', search.trim().toLowerCase());
      if (week && week !== 'all') params.set('week', week);
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/betting-log?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 100)}`);

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
  }, [userId]);

  // Optimistic update — syncs gameDate into every leg so table reads stay fresh.
  // Parent calls this; no need for modal to do its own fetch.
  const updateBet = useCallback(async (updates: any) => {
    const id = updates.id;
    if (!id) throw new Error('updateBet: missing id');

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
    } catch (err) {
      console.error('[useBets] update error:', err);
      fetchBets(true); // revert on failure
      throw err;
    }
  }, [userId, fetchBets]);

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

  return { bets, setBets, loading, error, fetchBets, updateBet, deleteBet,
           refresh: () => fetchBets(true) };
}