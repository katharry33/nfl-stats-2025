'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Bet, BetLeg, BetslipContextType } from '@/lib/types';

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  // Bet Slip State
  const [selections, setSelections] = useState<BetLeg[]>([]);

  // Load on Mount
  useEffect(() => {
    const saved = localStorage.getItem('active_betslip');
    if (saved) {
      try {
        setSelections(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved betslip", e);
      }
    }
  }, []);

  // Save on Change
  useEffect(() => {
    localStorage.setItem('active_betslip', JSON.stringify(selections));
  }, [selections]);

  // Betting Log State
  const [bets, setBets] = useState<Bet[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentSearch, setCurrentSearch] = useState(''); // New: Track search for pagination

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING --- //

  const fetchBets = async (search: string = '', isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setCurrentSearch(search); // Store the search term
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      // Use the provided search, or fall back to the stored one if loading more
      const searchTerm = isLoadMore ? currentSearch : search;
      if (searchTerm) params.append('search', searchTerm);
      if (isLoadMore && nextCursor) params.append('cursor', nextCursor);
      
      // Ensure we fetch from both legacy and new via your updated API
      params.append('year', 'all'); 

      const response = await fetch(`/api/betting-log?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch bets');
      
      const data = await response.json();

      // NORMALIZATION LAYER: Fix legacy schema here so components don't have to
      const normalizedLogs = data.logs.map((bet: any) => {
        const isLegacy = !bet.legs || !Array.isArray(bet.legs) || bet.legs.length === 0;
        return {
            ...bet,
            legs: isLegacy ? [{
              id: bet.id, // Use parent ID for the virtual leg
              player: bet.player || bet.playerteam || bet.Player || 'Unknown',
              prop: bet.prop || bet.Prop || 'N/A',
              selection: bet.selection || bet['Over/Under?'] || '',
              line: bet.line || bet.Line || '0',
              status: bet.status || bet.result || bet['Actual Result'] || 'PENDING',
              matchup: bet.matchup || bet.Matchup || '',
              week: bet.week || bet.Week || null
            }] : bet.legs,
            createdAt: bet.createdAt || new Date().toISOString()
          };
        });

      setBets(prev => isLoadMore ? [...prev, ...normalizedLogs] : normalizedLogs);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreBets = async () => {
    if (hasMore && !loadingMore) {
      // It now uses the stored currentSearch automatically
      await fetchBets(currentSearch, true); 
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

  // --- BET SLIP ACTIONS --- //

  const addLeg = (leg: BetLeg) => {
    setSelections(prev => [...prev, { ...leg, id: leg.id || new Date().toISOString() }]);
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => prev.filter(l => l.id !== legId));
  };

  const clearSlip = () => {
    setSelections([]);
  };

  const updateLeg = (legId: string, updates: Partial<BetLeg>) => {
    setSelections(prev => prev.map(leg => leg.id === legId ? { ...leg, ...updates } : leg));
  };

  const submitBet = async (betData: Partial<Bet>) => {
    // Implementation for submitting a bet
    console.log('Submitting bet:', betData);
    // Here you would typically call an API
    // POST /api/bets
    clearSlip();
    await fetchBets(); // Refresh log
  };

  // --- BETTING LOG ACTIONS --- //

  const deleteBet = async (id: string) => {
    // Note: Ensure your API endpoint name matches your route.ts
    const res = await fetch(`/api/betting-log?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Optimistic UI update: Remove from state immediately
      setBets(prev => prev.filter(b => b.id !== id));
    } else {
      throw new Error('Failed to delete bet');
    }
  };

  const updateBet = async (id: string, updates: Partial<Bet>) => {
    // Implementation for updating a bet
    await fetch('/api/betting-log', { method: 'PUT', body: JSON.stringify({ id, ...updates }) });
    await fetchBets(); // Refresh log
  };

  return (
    <BetslipContext.Provider value={{
      selections, 
      bets, 
      loading, 
      loadingMore,
      hasMore,
      error, 
      fetchBets, 
      loadMoreBets,
      addLeg, 
      addSelection: addLeg, // Alias for prop-card
      removeLeg, 
      clearSlip, 
      updateLeg, 
      submitBet, 
      deleteBet, 
      updateBet 
    }}>
      {children}
    </BetslipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetslipContext);
  if (context === undefined) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
}
