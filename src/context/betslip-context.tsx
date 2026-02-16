'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { BetLeg, Bet } from '../lib/types';
import { addBet } from '../lib/actions/bet-actions';
import { useAuth } from '@/lib/firebase/provider';
import { toast } from 'sonner';

export interface BetslipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (legId: string) => void;
  clearSelections: () => void;
  updateLeg: (legId: string, updates: Partial<BetLeg>) => void;
  submitBet: (bet: Omit<Bet, 'id' | 'userId'>) => Promise<void>;
}

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export function BetslipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selections, setSelections] = useState<BetLeg[]>([]);

  const addLeg = (leg: BetLeg) => {
    setSelections(prev => {
      const exists = prev.some(l => l.propId === leg.propId);
      if (exists) {
        toast.warning("Prop already in slip");
        return prev;
      }
      toast.success("Added to Bet Slip");
      return [...prev, leg];
    });
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => prev.filter(l => l.id !== legId));
    toast.error("Removed from Bet Slip");
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

  const submitBet = async (bet: Omit<Bet, 'id' | 'userId'>) => {
    if (!user) {
      toast.error("You must be logged in to place a bet.");
      return;
    }
    try {
      await addBet(user.uid, { ...bet, legs: selections });
      toast.success("Bet placed successfully!");
      clearSelections();
    } catch (error) {
      console.error("Failed to submit bet:", error);
      toast.error("Failed to place bet.");
    }
  };

  return (
    <BetslipContext.Provider value={{
      selections,
      addLeg,
      removeLeg,
      updateLeg,
      clearSelections,
      submitBet
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
