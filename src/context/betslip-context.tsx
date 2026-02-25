'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Bet {
  id: string;
  createdAt: string;
  [key: string]: any;
}

export interface BetSlipContextType {
  bets: Bet[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchBets: () => Promise<void>;
  loadMoreBets: () => Promise<void>;
  updateBet: (id: string, updates: Partial<Bet>) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  selections: any[];
  addLeg: (leg: any) => void;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  totalParlayOdds: number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  }
  return context;
};

const PAGE_SIZE = 50;

export const BetSlipProvider = ({ children }: { children: React.ReactNode }) => {
  const [selections, setSelections] = useState<any[]>([]);
  const [totalParlayOdds, setTotalParlayOdds] = useState(0);

  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/betting-log?limit=${PAGE_SIZE}`);
      const data = await response.json();
      if (response.ok) {
        setBets(data.logs || []);
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
      } else {
        throw new Error(data.error || 'Failed to fetch bets');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const loadMoreBets = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(`/api/betting-log?limit=${PAGE_SIZE}&cursor=${nextCursor}`);
      const data = await response.json();
      if (response.ok) {
        setBets(prev => [...prev, ...(data.logs || [])]); 
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
      } else {
        throw new Error(data.error || 'Failed to load more bets');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor]);

  const updateBet = async (id: string, updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBet = async (id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
  };

  const calculateTotalOdds = (currentSelections: any[]) => {
    if (currentSelections.length === 0) return 0;
    const total = currentSelections.reduce((acc, leg) => {
      if (leg.odds) {
        const decimalOdds = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
        return acc * decimalOdds;
      }
      return acc;
    }, 1);
    return total > 1 ? (total - 1) * 100 : 0;
  };

  const addLeg = (leg: any) => {
    setSelections(prev => {
      const newSelections = [...prev, leg];
      setTotalParlayOdds(calculateTotalOdds(newSelections));
      return newSelections;
    });
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => {
      const newSelections = prev.filter(l => l.id !== legId);
      setTotalParlayOdds(calculateTotalOdds(newSelections));
      return newSelections;
    });
  };

  const clearSlip = () => {
    setSelections([]);
    setTotalParlayOdds(0);
  };

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  return (
    <BetSlipContext.Provider value={{
      bets,
      loading,
      loadingMore,
      hasMore,
      error,
      fetchBets,
      loadMoreBets,
      updateBet,
      deleteBet,
      selections,
      addLeg,
      removeLeg,
      clearSlip,
      totalParlayOdds,
    }}>
      {children}
    </BetSlipContext.Provider>
  );
};