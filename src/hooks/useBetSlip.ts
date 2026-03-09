'use client';

import { useState, useCallback, useEffect } from 'react';
import { BetLeg, NormalizedProp, BetSlipItem } from '@/lib/types';

export interface UseBetSlipReturn {
  selections: BetSlipItem[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clear: () => void;
  updateAmount: (id: string, amount: number) => void;
  isInSlip: (id: string) => boolean;
  totalStake: number;
  totalProps: number;
  savingIds: Set<string>;
  isInitialized: boolean;
}

/**
 * Hook to manage the active bet slip state.
 * @param week - Optional week number (defaults to 1 for global pages)
 * @param season - Optional season year (defaults to 2025)
 */
export function useBetSlip(week: number = 1, season: number = 2025): UseBetSlipReturn {
  const [items, setItems] = useState<BetSlipItem[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize hook - could be expanded to load from localStorage
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const addLegToSlip = useCallback((leg: BetLeg) => {
    setItems(prev => {
      // Check for existing ID to prevent duplicates
      const exists = prev.some(item => String(item.prop.id) === String(leg.id));
      if (exists) return prev;

      const propFromLeg: NormalizedProp = {
        id: String(leg.id),
        player: leg.player || 'Unknown',
        prop: leg.prop || 'Unknown Prop',
        line: leg.line ?? 0,
        team: leg.team || '',
        matchup: leg.matchup || '',
        gameDate: leg.gameDate || new Date().toISOString(),
        overUnder: leg.selection as 'Over' | 'Under',
        odds: leg.odds || -110,
        isManual: true,
        playerAvg: null,
        seasonHitPct: null,
        bestOdds: null,
      };
      
      const newSlipItem: BetSlipItem = {
        prop: propFromLeg,
        betAmount: 10, // default amount
        overUnder: leg.selection,
        odds: leg.odds,
      };

      return [...prev, newSlipItem];
    });
  }, []);

  const removeFromBetSlip = useCallback((propId: string) => {
    setItems(prev => prev.filter(i => String(i.prop.id) !== String(propId)));
  }, []);

  const clearBetSlip = useCallback(() => setItems([]), []);

  const updateBetAmount = useCallback((propId: string, amount: number) => {
    setItems(prev =>
      prev.map(i => String(i.prop.id) === String(propId) ? { ...i, betAmount: amount } : i)
    );
  }, []);

  const isInBetSlip = useCallback(
    (propId: string) => items.some(i => String(i.prop.id) === String(propId)),
    [items]
  );

  return {
    selections: items,
    addLeg: addLegToSlip,
    removeLeg: removeFromBetSlip,
    clear: clearBetSlip,
    updateAmount: updateBetAmount,
    isInSlip: isInBetSlip,
    totalStake: items.reduce((sum, i) => sum + i.betAmount, 0),
    totalProps: items.length,
    savingIds,
    isInitialized,
  };
}