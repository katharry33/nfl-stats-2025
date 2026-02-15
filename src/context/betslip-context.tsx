'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { BetLeg } from '../lib/types';

export interface BetslipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (legId: string) => void;
  clearSelections: () => void;
  updateLeg: (legId: string, updates: Partial<BetLeg>) => void;
}

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);

  const addLeg = (leg: BetLeg) => {
    setSelections(prev => {
      const exists = prev.some(l => l.propId === leg.propId);
      if (exists) return prev;
      return [...prev, leg];
    });
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => prev.filter(l => l.id !== legId));
  };

  const clearSelections = () => setSelections([]);

  const updateLeg = (legId: string, updates: Partial<BetLeg>) => {
    setSelections(prev =>
      prev.map(leg =>
        leg.id === legId
          ? { ...leg, ...updates }
          : leg
      )
    );
  };

  return (
    <BetslipContext.Provider value={{
      selections,
      addLeg,
      removeLeg,
      updateLeg,
      clearSelections
    }}>
      {children}
    </BetslipContext.Provider>
  );
}

export const useBetSlip = () => {
  const context = useContext(BetslipContext);
  if (!context) {
    throw new Error('useBetSlip must be used within a BetslipProvider');
  }
  return context;
};
