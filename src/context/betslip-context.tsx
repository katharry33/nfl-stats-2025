'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { BetLeg, Bet, Selection } from '../lib/types';
import { toast } from 'sonner';
import { normalizeBet } from '../lib/services/bet-normalizer';

export interface BetslipContextType {
  selections: BetLeg[];
  bets: Bet[];
  loading: boolean;
  fetchBets: () => Promise<void>;
  addLeg: (leg: any) => void;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  updateLeg: (legId: string, updates: Partial<BetLeg>) => void;
  submitBet: (bet: Partial<Bet>) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  updateBet: (id: string, updates: Partial<Bet>) => Promise<void>;
}

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/betting-log?userId=dev-user');
      if (response.ok) {
        const data = await response.json();
        const cleanBets = (data.bets || []).map(normalizeBet);
        setBets(cleanBets);
        console.log(`Context: Fetched and normalized ${cleanBets.length} bets.`);
      } else {
        toast.error("Failed to fetch betting log from API.");
      }
    } catch (err) {
      console.error("Context fetch error:", err);
      toast.error("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBets(); }, [fetchBets]);

  const addLeg = (incoming: any) => {
    setSelections(prev => {
      const propId = incoming.id || incoming.Id || incoming.propId;
      const selection = incoming.selection || (incoming.overunder === 'Over' || incoming.OverUnder === 'Over' ? 'Over' : 'Under');

      const exists = prev.some(l => {
        const legPropId = l.propId || l.id;
        return legPropId === propId && l.selection === selection;
      });

      if (exists) {
        toast.warning("Selection already in bet slip.");
        return prev;
      }

      const newLeg: BetLeg = {
        id: crypto.randomUUID(),
        propId: propId,
        player: incoming.player || incoming.Player || 'Unknown Player',
        team: incoming.team || incoming.Team || 'TBD',
        prop: incoming.prop || incoming.Prop || 'Unknown Prop',
        line: Number(incoming.line || incoming.Line || 0),
        odds: Number(incoming.odds || incoming.Odds || -110),
        selection: selection,
        status: 'pending',
        gameDate: incoming.gameDate || incoming.GameDate || incoming.createdAt || new Date().toISOString(),
        matchup: incoming.matchup || incoming.Matchup || 'TBD',
        week: (incoming.week || incoming.Week) ? Number(incoming.week || incoming.Week) : undefined,
      };

      toast.success(`${newLeg.player} ${newLeg.prop} added to slip.`);
      return [...prev, newLeg];
    });
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => prev.filter(l => l.id !== legId));
    toast.info("Selection removed from slip.");
  };

  const clearSlip = () => setSelections([]);

  const updateLeg = (legId: string, updates: Partial<BetLeg>) => {
    setSelections(prev => prev.map(leg => leg.id === legId ? { ...leg, ...updates } : leg));
  };

  const submitBet = async (betData: Partial<Bet>) => {
    try {
      await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...betData, userId: 'dev-user', legs: betData.legs || selections }),
      });
      await fetchBets();
      toast.success("Bet saved successfully!");
      clearSlip();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteBet = async (id: string) => { await fetchBets(); };
  const updateBet = async (id: string, updates: Partial<Bet>) => { await fetchBets(); };

  return (
    <BetslipContext.Provider value={{
      selections, bets, loading, fetchBets, addLeg, removeLeg, 
      clearSlip, updateLeg, submitBet, deleteBet, updateBet
    }}>
      {children}
    </BetslipContext.Provider>
  );
}

export const useBetSlip = () => {
  const context = useContext(BetslipContext);
  if (!context) throw new Error('useBetSlip must be used within a BetslipProvider');
  return context;
};
