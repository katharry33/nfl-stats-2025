'use client';
import React, { createContext, useContext, useState } from 'react';
import { BetLeg, Bet } from "@/lib/types"; 

interface BetSlipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  updateLeg: (id: string, updates: Partial<BetLeg>) => void;
  submitBet: (betData: Omit<Bet, "createdAt" | "userId" | "id" | "payout">) => Promise<void>;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);

  const addLeg = (leg: BetLeg) => {
    setSelections((prev) => [...prev.filter(l => l.id !== leg.id), leg]);
  };

  const removeLeg = (id: string) => {
    setSelections((prev) => prev.filter((leg) => leg.id !== id));
  };

  const clearSlip = () => setSelections([]);

  const updateLeg = (id: string, updates: Partial<BetLeg>) => {
    setSelections(prev => prev.map(leg => 
      leg.id === id ? { ...leg, ...updates } : leg
    ));
  };

  const submitBet = async (betData: Omit<Bet, 'id' | 'userId' | 'createdAt' | 'payout'>) => {
    // Your logic to save to Firebase goes here
    console.log("Submitting bet:", betData);
    // After success:
    clearSlip();
  };

  return (
    <BetSlipContext.Provider value={{ selections, addLeg, removeLeg, clearSlip, updateLeg, submitBet }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error("useBetSlip must be used within a BetSlipProvider");
  return context;
}
