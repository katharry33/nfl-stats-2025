'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Bet } from '@/lib/types';
import { useWallet } from '@/context/wallet-context';
import { calculateRecommendation } from '@/lib/math/kelly';

export interface BetSlipContextType {
  bets: Bet[];
  setBets: React.Dispatch<React.SetStateAction<Bet[]>>;
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchBets: (search: string, season: string) => Promise<void>;
  loadMoreBets: (search: string, season: string) => Promise<void>;
  updateBet: (id: string, updates: Partial<Bet>) => Promise<void>;
  deleteBet: (id: string) => void;
  selections: any[];
  setSelections: React.Dispatch<React.SetStateAction<any[]>>;
  addLeg: (leg: any) => void;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  totalParlayOdds: number;
  isInitialized: boolean;
  kelly: {
    recommendedStake: number;
    expectedValue: number;
  };
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const useBetSlip = () => {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
};

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

export const BetSlipProvider = ({ children }: { children: React.ReactNode }) => {
  const [selections, setSelections] = useState<any[]>([]);
  const [totalParlayOdds, setTotalParlayOdds] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const { bankroll } = useWallet();

  useEffect(() => {
    const savedSlip = localStorage.getItem('active_betslip');
    if (savedSlip) {
      try {
        setSelections(JSON.parse(savedSlip));
      } catch (e) {
        console.error("Failed to parse saved betslip", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('active_betslip', JSON.stringify(selections));
      setTotalParlayOdds(calcOdds(selections));
    }
  }, [selections, isInitialized]);

  const kelly = useMemo(() => {
    const modelHitRate = selections.length > 1 ? 25 : 55; // Lower for parlays
    const americanOdds = totalParlayOdds.toString();

    if (totalParlayOdds === 0) {
      return { recommendedStake: 0, expectedValue: 0 };
    }

    const { recommendedWager, expectedValue } = calculateRecommendation(
      modelHitRate,
      americanOdds,
      bankroll
    );

    return {
      recommendedStake: recommendedWager > 0 ? recommendedWager / 4 : 0,
      expectedValue: expectedValue * 100, // as percent
    };
  }, [totalParlayOdds, bankroll, selections.length]);

  // ... (rest of the provider: fetchBets, loadMoreBets, etc.)
  const [bets, setBets] = useState<Bet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchBets = useCallback(async (search: string, season: string) => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      console.error('loadMoreBets:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor]);

  const updateBet = async (id: string, updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBet = (id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
  };

  const addLeg = useCallback((leg: any) => {
    setSelections(prev => {
      const incomingId = leg.id || leg.propId;
      const isDupe = prev.some(l => {
        const existingId = l.id || l.propId;
        return existingId === incomingId;
      });
      if (isDupe) return prev;
      return [...prev, leg];
    });
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setSelections(prev => prev.filter(l => (l.propId || l.id) !== legId && l.id !== legId));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    try { localStorage.removeItem('active_betslip'); } catch {}
  }, []);

  return (
    <BetSlipContext.Provider value={{
      bets, setBets, totalCount, loading, loadingMore, hasMore, error,
      fetchBets, loadMoreBets, updateBet, deleteBet,
      selections, setSelections, addLeg, removeLeg, clearSlip, totalParlayOdds, isInitialized,
      kelly,
    }}>
      {children}
    </BetSlipContext.Provider>
  );
};
