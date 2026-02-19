'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Bet, BetLeg } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export interface BetslipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (legId: string) => void;
  clearSlip: () => void; // Primary name
  clearSelections: () => void; // Alias for compatibility
  updateLeg: (legId: string, updates: Partial<BetLeg>) => void;
  submitBet: (bet: Partial<Bet>) => Promise<void>;
}

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);
  const router = useRouter();

  const addLeg = (leg: BetLeg) => {
    setSelections(prev => {
      const exists = prev.some(l => l.propId === leg.propId && l.selection === leg.selection);
      if (exists) {
        toast.warning("Prop already in slip");
        return prev;
      }
      toast.success(`Added ${leg.player} to slip`);
      return [...prev, leg];
    });
  };

  const removeLeg = (legId: string) => {
    setSelections(prev => prev.filter(l => l.id !== legId));
    toast.info("Removed from slip");
  };

  const clearSlip = () => {
    setSelections([]);
    toast.info("Bet slip cleared");
  };

  // Alias for compatibility
  const clearSelections = clearSlip;

  const updateLeg = (legId: string, updates: Partial<BetLeg>) => {
    setSelections(prev =>
      prev.map(leg =>
        leg.id === legId
          ? { ...leg, ...updates }
          : leg
      )
    );
  };

  const submitBet = async (bet: Partial<Bet>) => {
    try {
      console.log('Submitting bet to API:', { ...bet, legs: selections });
      
      // Call the betting log API
      const response = await fetch('/api/betting-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bet,
          legs: selections,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save bet');
      }

      const result = await response.json();
      console.log('Bet saved:', result);
      
      toast.success("Bet saved to betting log!");
      clearSlip();
      
      // Navigate to betting log to see the saved bet
      setTimeout(() => {
        router.push('/betting-log');
      }, 1000);
      
    } catch (error: any) {
      console.error("Failed to submit bet:", error);
      toast.error(error.message || "Failed to save bet");
      throw error;
    }
  };

  return (
    <BetslipContext.Provider value={{
      selections,
      addLeg,
      removeLeg,
      clearSlip,
      clearSelections,
      updateLeg,
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