'use client';
// src/hooks/useBetSlip.ts
// Flat selection shape — no nested objects, safe to render anywhere

import { useState, useCallback, useEffect } from 'react';
import type { BetLeg } from '@/lib/types';

// ─── Flat selection — everything a panel/parlay page needs ───────────────────
export interface BetSlipSelection {
  id:        string;
  propId?:   string;
  player:    string;
  propName:  string;   // renamed from 'prop' to avoid collision with NormalizedProp.prop
  line:      number;
  selection: 'Over' | 'Under';
  odds?:     number;
  team?:     string;
  matchup?:  string;
  week?:     number;
  season?:   number;
  gameDate?: string;
  // enrichment display fields (optional)
  confidenceScore?: number | null;
  bestEdgePct?:     number | null;
  expectedValue?:   number | null;
}

export interface UseBetSlipReturn {
  selections:    BetSlipSelection[];
  addLeg:        (leg: BetLeg) => void;
  removeLeg:     (id: string) => void;
  clear:         () => void;
  updateAmount:  (id: string, amount: number) => void;
  isInSlip:      (id: string) => boolean;
  totalStake:    number;
  totalProps:    number;
  isInitialized: boolean;
}

export function useBetSlip(week: number = 1, season: number = 2025): UseBetSlipReturn {
  const [items,         setItems]         = useState<BetSlipSelection[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => { setIsInitialized(true); }, []);

  const addLeg = useCallback((leg: BetLeg) => {
    setItems(prev => {
      const id = String(leg.id ?? leg.propId ?? '');
      if (prev.some(s => s.id === id)) return prev;

      const selection: BetSlipSelection = {
        id,
        propId:    String(leg.propId ?? leg.id ?? ''),
        player:    leg.player    || 'Unknown',
        propName:  leg.prop      || 'Prop',      // string field name
        line:      leg.line      ?? 0,
        selection: (leg.selection as 'Over' | 'Under') || 'Over',
        odds:      leg.odds,
        team:      leg.team,
        matchup:   leg.matchup,
        week:      leg.week      ?? week,
        season:    leg.season    ?? season,
        gameDate:  leg.gameDate,
        // enrichment fields passed through if leg carries them
        confidenceScore: (leg as any).confidenceScore ?? null,
        bestEdgePct:     (leg as any).bestEdgePct     ?? null,
        expectedValue:   (leg as any).expectedValue   ?? null,
      };
      return [...prev, selection];
    });
  }, [week, season]);

  const removeLeg  = useCallback((id: string) => setItems(prev => prev.filter(s => s.id !== id)), []);
  const clear      = useCallback(() => setItems([]), []);
  const updateAmount = useCallback((_id: string, _amount: number) => {}, []); // stub — extend if needed

  const isInSlip = useCallback(
    (id: string) => items.some(s => s.id === id || s.propId === id),
    [items]
  );

  return {
    selections: items,
    addLeg,
    removeLeg,
    clear,
    updateAmount,
    isInSlip,
    totalStake:    0,
    totalProps:    items.length,
    isInitialized,
  };
}