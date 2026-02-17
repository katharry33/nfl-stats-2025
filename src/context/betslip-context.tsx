'use client';
import React, { createContext, useContext, useState } from 'react';
import { BetLeg } from "@/lib/types"; 

interface BetSlipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
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

  return (
    <BetSlipContext.Provider value={{ selections, addLeg, removeLeg, clearSlip }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error("useBetSlip must be used within a BetSlipProvider");
  return context;
}