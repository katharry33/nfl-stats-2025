// src/hooks/useBetSlip.ts
'use client';

import { useState, useCallback } from 'react';
import { NFLProp, BetLeg, BetSlipItem } from '@/lib/types';

export interface UseBetSlipReturn {
  items: BetSlipItem[];
  addToBetSlip: (prop: NFLProp & { id: string }, overUnder?: 'Over' | 'Under') => void;
  removeFromBetSlip: (propId: string) => void;
  updateBetAmount: (propId: string, amount: number) => void;
  clearBetSlip: () => void;
  isInBetSlip: (propId: string) => boolean;
  addLegToSlip: (leg: BetLeg) => void;
  totalStake: number;
  totalProps: number;
  savingIds: Set<string>;
}

export function useBetSlip(week: number, season = 2025): UseBetSlipReturn {
  const [items, setItems]       = useState<BetSlipItem[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const addToBetSlip = useCallback((
    prop: NFLProp & { id: string },
    overUnder?: 'Over' | 'Under'
  ) => {
    setItems(prev => {
      if (prev.some(i => i.prop.id === prop.id)) return prev; // already added
      const selection = overUnder ?? (prop.overUnder as 'Over' | 'Under') ?? 'Over';
      const odds = selection === 'Over' ? prop.overOdds : prop.underOdds;
      return [...prev, {
        prop,
        betAmount: 10, // default stake
        overUnder: selection,
        odds: odds ?? -110,
      }];
    });
  }, []);

  const removeFromBetSlip = useCallback((propId: string) => {
    setItems(prev => prev.filter(i => i.prop.id !== propId));
  }, []);

  const addLegToSlip = useCallback((leg: BetLeg) => {
    setItems(prev => {
      if (prev.some(item => item.prop.id === leg.id)) return prev;

      const propFromLeg = {
        id: leg.id,
        player: leg.player,
        prop: leg.prop,
        line: leg.line,
        team: leg.team,
        matchup: leg.matchup,
        gameDate: leg.gameDate,
        overUnder: leg.selection,
        odds: leg.odds,
        isManual: true,
      };
      
      const newSlipItem: BetSlipItem = {
        prop: propFromLeg as NFLProp & { id: string },
        betAmount: 10, // default stake
        overUnder: leg.selection,
        odds: leg.odds,
      };

      return [...prev, newSlipItem];
    });
  }, []);

  const updateBetAmount = useCallback((propId: string, amount: number) => {
    setItems(prev =>
      prev.map(i => i.prop.id === propId ? { ...i, betAmount: amount } : i)
    );
  }, []);

  const clearBetSlip = useCallback(() => setItems([]), []);

  const isInBetSlip = useCallback(
    (propId: string) => items.some(i => i.prop.id === propId),
    [items]
  );

  // Persist bet amounts to Firestore when user is done editing
  const persistBetAmount = useCallback(async (propId: string, betAmount: number, overUnder: string) => {
    setSavingIds(prev => new Set(prev).add(propId));
    try {
      await fetch(`/api/props/${propId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount, overUnder, week, season, betStatus: 'Pending' }),
      });
    } catch (err) {
      console.error('Failed to save bet amount:', err);
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(propId); return s; });
    }
  }, [week, season]);

  const totalStake = items.reduce((sum, i) => sum + i.betAmount, 0);
  const totalProps = items.length;

  return {
    items,
    addToBetSlip,
    removeFromBetSlip,
    updateBetAmount,
    clearBetSlip,
    isInBetSlip,
    addLegToSlip,
    totalStake,
    totalProps,
    savingIds,
  };
}