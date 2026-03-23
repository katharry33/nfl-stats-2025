'use client';

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useMemo,
} from 'react';
import type { Bet } from '@/lib/types';
import { useWallet } from '@/context/WalletContext';
import { calculateRecommendation } from '@/lib/math/kelly';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BetSlipContextType {
  bets:         Bet[];
  setBets:      React.Dispatch<React.SetStateAction<Bet[]>>;
  totalCount:   number;
  loading:      boolean;
  loadingMore:  boolean;
  hasMore:      boolean;
  error:        string | null;
  fetchBets:    (search: string, season: string) => Promise<void>;
  loadMoreBets: (search: string, season: string) => Promise<void>;
  updateBet:    (id: string, updates: Partial<Bet>) => Promise<void>;
  deleteBet:    (id: string) => void;

  selections:       any[];
  setSelections:    React.Dispatch<React.SetStateAction<any[]>>;
  addLeg:           (leg: any) => void;
  addToSlip:        (leg: any) => void; // Alias
  slip:             { legs: any[] };    // Alias
  legs:             any[];              // Alias
  removeLeg:        (legId: string) => void;
  clearSlip:        () => void;
  totalParlayOdds:  number;
  isInitialized:    boolean;
  kelly: { recommendedStake: number; expectedValue: number };

  clear:       () => void;
  isInSlip:    (id: string) => boolean;
  totalProps:  number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function useBetSlip(): BetSlipContextType {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function calcOdds(sels: any[]): number {
  if (!sels.length) return 0;
  const dec = sels.reduce((acc, leg) => {
    const o = Number(leg.odds);
    if (!o) return acc;
    return acc * (o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1);
  }, 1);
  return dec > 1 ? parseFloat(((dec - 1) * 100).toFixed(0)) : 0;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('active_betslip');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [totalParlayOdds, setTotalParlayOdds] = useState(0);
  const [isInitialized] = useState(true);

  const { bankroll } = useWallet();

  useEffect(() => {
    try { localStorage.setItem('active_betslip', JSON.stringify(selections)); }
    catch {}
    setTotalParlayOdds(calcOdds(selections));
  }, [selections]);

  const kelly = useMemo(() => {
    if (totalParlayOdds === 0) return { recommendedStake: 0, expectedValue: 0 };
    const modelHitRate = selections.length > 1 ? 25 : 55;
    const { recommendedWager, expectedValue } = calculateRecommendation(
      modelHitRate, totalParlayOdds.toString(), bankroll,
    );
    return {
      recommendedStake: recommendedWager > 0 ? recommendedWager / 4 : 0,
      expectedValue: expectedValue * 100,
    };
  }, [totalParlayOdds, bankroll, selections.length]);

  const addLeg = useCallback((leg: any) => {
    setSelections(prev => {
      const incoming = String(leg.id ?? leg.propId ?? '');
      if (prev.some(l => String(l.id ?? l.propId ?? '') === incoming)) return prev;
      return [...prev, leg];
    });
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setSelections(prev =>
      prev.filter(l => String(l.propId ?? l.id ?? '') !== legId && String(l.id ?? '') !== legId)
    );
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    try { localStorage.removeItem('active_betslip'); } catch {}
  }, []);

  const isInSlip = useCallback(
    (id: string) => selections.some(s => String(s.id ?? s.propId ?? '') === id),
    [selections],
  );

  const [bets, setBets] = useState<Bet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchBets = useCallback(async (search: string, season: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        season: season === 'all' ? '' : season,
        player: search,
      });
      const res = await fetch(`/api/betting-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBets(data.bets ?? []);
      setTotalCount(data.totalCount ?? 0);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const loadMoreBets = useCallback(async (search: string, season: string) => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        season: season === 'all' ? '' : season,
        cursor: nextCursor,
        player: search,
      });
      const res = await fetch(`/api/betting-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBets(prev => [...prev, ...(data.bets ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) { console.error(err); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, nextCursor]);

  const updateBet = useCallback(async (id: string, updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    try {
      await fetch(`/api/betting-log`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
    } catch (err) { fetchBets('', 'all'); }
  }, [fetchBets]);

  const deleteBet = useCallback((id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <BetSlipContext.Provider value={{
      bets, setBets, totalCount, loading, loadingMore, hasMore, error,
      fetchBets, loadMoreBets, updateBet, deleteBet,
      selections, setSelections, addLeg, removeLeg, clearSlip,
      totalParlayOdds, isInitialized, kelly,
      addToSlip: addLeg,
      slip: { legs: selections },
      legs: selections,
      clear: clearSlip,
      isInSlip,
      totalProps: selections.length,
    }}>
      {children}
    </BetSlipContext.Provider>
  );
}