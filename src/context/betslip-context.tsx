'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Bet } from '@/lib/types';

export interface BetSlipContextType {
  bets:         Bet[];
  totalCount:   number;
  loading:      boolean;
  loadingMore:  boolean;
  hasMore:      boolean;
  error:        string | null;
  fetchBets:    (search: string, season: string) => Promise<void>;
  loadMoreBets: (search: string, season: string) => Promise<void>;
  updateBet:    (id: string, updates: Partial<Bet>) => Promise<void>;
  deleteBet:    (id: string) => void;
  selections:   any[];
  addLeg:       (leg: any) => void;
  removeLeg:    (legId: string) => void;
  clearSlip:    () => void;
  totalParlayOdds: number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const useBetSlip = () => {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
};

const STORAGE_KEY = 'sweetspot_betslip';
const PAGE_SIZE   = 50;

function calcOdds(sels: any[]): number {
  if (!sels.length) return 0;
  const dec = sels.reduce((acc, leg) => {
    const o = Number(leg.odds);
    if (!o) return acc;
    return acc * (o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1);
  }, 1);
  return dec > 1 ? parseFloat(((dec - 1) * 100).toFixed(2)) : 0;
}

// Read synchronously from localStorage — used in initial state so Parlay Studio
// doesn't need to wait for a useEffect to hydrate.
function readSlipFromStorage(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const BetSlipProvider = ({ children }: { children: React.ReactNode }) => {
  // ── Bet slip selections ───────────────────────────────────────────────────
  // Initialize synchronously from localStorage so selections are available
  // immediately when Parlay Studio mounts (no useEffect delay).
  const [selections,       setSelections]       = useState<any[]>(() => readSlipFromStorage());
  const [totalParlayOdds,  setTotalParlayOdds]  = useState(() => calcOdds(readSlipFromStorage()));

  // Persist to localStorage whenever selections change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
    } catch {}
  }, [selections]);

  // ── Historical bets ───────────────────────────────────────────────────────
  const [bets,        setBets]        = useState<Bet[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);

  const fetchBets = useCallback(async (search: string, season: string) => {
    setLoading(true);
    setError(null);
    setBets([]);
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        season: season === 'all' ? '' : season,
        player: search,
      });
      const res  = await fetch(`/api/betting-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBets(data.bets ?? []);
      setTotalCount(data.totalCount ?? 0);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreBets = useCallback(async (search: string, season: string) => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        season: season === 'all' ? '' : season,
        cursor: nextCursor,
        player: search,
      });
      const res  = await fetch(`/api/betting-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBets(prev => [...prev, ...(data.bets ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      console.error('loadMoreBets:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor]);

  const updateBet = async (id: string, updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBet = (id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
  };

  // ── Betslip selection actions ─────────────────────────────────────────────

  const addLeg = useCallback((leg: any) => {
    setSelections(prev => {
      // Guard against exact duplicate
      if (prev.some(l => (l.propId || l.id) === (leg.propId || leg.id) && l.selection === leg.selection)) {
        return prev;
      }
      const next = [...prev, leg];
      setTotalParlayOdds(calcOdds(next));
      return next;
    });
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setSelections(prev => {
      const next = prev.filter(l => (l.propId || l.id) !== legId && l.id !== legId);
      setTotalParlayOdds(calcOdds(next));
      return next;
    });
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setTotalParlayOdds(0);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <BetSlipContext.Provider value={{
      bets, totalCount, loading, loadingMore, hasMore, error,
      fetchBets, loadMoreBets, updateBet, deleteBet,
      selections, addLeg, removeLeg, clearSlip, totalParlayOdds,
    }}>
      {children}
    </BetSlipContext.Provider>
  );
};