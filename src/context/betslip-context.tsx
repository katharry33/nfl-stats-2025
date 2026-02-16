'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BetLeg, BetSlipContextType } from '@/lib/types';

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);

  // 1. Add or Toggle a Leg
  const addLeg = (leg: BetLeg) => {
    setSelections((prev) => {
      const exists = prev.find((i) => i.id === leg.id);
      
      // If user clicks the exact same side, remove it (toggle off)
      if (exists?.selection === leg.selection) {
        return prev.filter((i) => i.id !== leg.id);
      }
      
      // If user clicks the other side (e.g., switches Over to Under), replace it
      return [...prev.filter((i) => i.id !== leg.id), leg];
    });
  };

  // 2. Remove a specific leg
  const removeLeg = (id: string) => {
    setSelections((prev) => prev.filter((i) => i.id !== id));
  };

  // 3. Update a leg (useful for Parlay Studio adjusting lines)
  const updateLeg = (id: string, updates: Partial<BetLeg>) => {
    setSelections((prev) => 
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  // 4. Clear everything
  const clearSelections = () => setSelections([]);

  // 5. Submit to Firebase (Placeholder for your API route)
  const submitBet = async () => {
    if (selections.length === 0) return;
    
    try {
      const response = await fetch('/api/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legs: selections }),
      });
      
      if (response.ok) {
        clearSelections();
      }
    } catch (error) {
      console.error("Failed to place bet:", error);
    }
  };

  return (
    <BetSlipContext.Provider value={{ 
      selections, 
      addLeg, 
      removeLeg, 
      updateLeg, 
      clearSelections, 
      submitBet 
    }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
};