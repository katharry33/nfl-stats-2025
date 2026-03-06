'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
// We import from our central types file
import { Bet, BetLeg, BetStatus } from '@/lib/types';

// Ensure BetLeg is exported so components like add-to-betslip-button can use it
export type { BetLeg }; 

export interface BetSlipContextType {
  // --- Historical Log State ---
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
  
  // --- Active Slip State ---
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  totalOdds: number;
  isInitialized: boolean;

  // --- Historical Props Interface ---
  isSubmitting: boolean;
  submitHistoricalBets: () => Promise<void>;
  setBetStatus: (id: string, status: BetStatus) => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const useBetSlip = () => {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
};

const PAGE_SIZE = 50;

/**
 * Professional American Odds Calculation
 */
function calculateAmericanOdds(selections: BetLeg[]): number {
  if (!selections.length) return 100;
  
  const totalDecimal = selections.reduce((acc, leg) => {
    const o = Number(leg.odds);
    if (!o) return acc;
    const decimal = o > 0 ? (o / 100) + 1 : (100 / Math.abs(o)) + 1;
    return acc * decimal;
  }, 1);

  if (totalDecimal >= 2.0) {
    return Math.round((totalDecimal - 1) * 100);
  } else {
    return Math.round(-100 / (totalDecimal - 1));
  }
}

export const BetSlipProvider = ({ children }: { children: React.ReactNode }) => {
  const { userId } = useAuth(); // Get Clerk userId for API requests

  // --- Active Slip State ---
  const [selections, setSelections] = useState<BetLeg[]>([]);
  const [totalOdds, setTotalOdds] = useState(100);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persistence logic
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
      setTotalOdds(calculateAmericanOdds(selections));
    }
  }, [selections, isInitialized]);

  // --- Historical Data Logic ---
  const [bets, setBets] = useState<Bet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchBets = useCallback(async (search: string, season: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        userId, // Pass auth ID to filter Firestore results
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
  }, [userId]);

  const loadMoreBets = useCallback(async (search: string, season: string) => {
    if (loadingMore || !hasMore || !nextCursor || !userId) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        userId,
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
  }, [loadingMore, hasMore, nextCursor, userId]);

  const updateBet = async (id: string, updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBet = (id: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
  };

  // --- Active Slip Handlers ---
  const clearSlip = useCallback(() => {
    setSelections([]);
  }, []);

  const addLeg = useCallback((leg: BetLeg) => {
    setSelections(prev => {
      const isDupe = prev.some(l => l.id === leg.id);
      if (isDupe) return prev;
      return [...prev, leg];
    });
  }, []);

  const removeLeg = useCallback((id: string) => {
    setSelections(prev => prev.filter(l => l.id !== id));
  }, []);

  const setBetStatus = useCallback((id: string, status: BetStatus) => {
    setSelections(prev => prev.map(leg => 
      leg.id === id ? { ...leg, status } : leg
    ));
  }, []);

  // --- Historical Submission Logic ---
  const submitHistoricalBets = useCallback(async () => {
    if (selections.length === 0 || !userId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          legs: selections, 
          type: 'historical',
          userId // Send current Clerk user ID to the database
        }),
      });
      if (!response.ok) throw new Error('Failed to submit historical bets');
      clearSlip(); 
    } catch (err: any) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selections, clearSlip, userId]);

  return (
    <BetSlipContext.Provider value={{
      bets, setBets, totalCount, loading, loadingMore, hasMore, error,
      fetchBets, loadMoreBets, updateBet, deleteBet,
      selections, addLeg, removeLeg, clearSlip, totalOdds, isInitialized,
      isSubmitting, submitHistoricalBets, setBetStatus
    }}>
      {children}
    </BetSlipContext.Provider>
  );
};