'use client';

import React, { createContext, useContext, useState } from 'react';
import { BetLeg, Bet } from "@/lib/types";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

// The data passed when submitting a bet. `createdAt` is now optional.
// It will be provided by the Parlay Studio for historical bets.
type BetSubmissionData = Omit<Bet, 'id' | 'userId' | 'payout'> & {
    createdAt?: Date;
};

interface BetSlipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  updateLeg: (id: string, updates: Partial<BetLeg>) => void;
  submitBet: (betData: BetSubmissionData) => Promise<void>;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetLeg[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  const addLeg = (leg: BetLeg) => {
    const legWithDefaults = { ...leg, status: 'pending' };
    setSelections((prev) => [...prev.filter(l => l.id !== leg.id), legWithDefaults]);
    toast.success("Leg added to bet slip!");
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

  const submitBet = async (betData: BetSubmissionData) => {
    if (!user) {
      toast.error("You must be logged in to save a bet.");
      return;
    }

    try {
      const betPayload = {
        ...betData,
        userId: user.uid,
        // Use the passed createdAt date for historical bets, otherwise use server time.
        createdAt: betData.createdAt ? betData.createdAt : serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'bettingLog'), betPayload);
      toast.success("Bet successfully saved to your Betting Log!", { 
        description: `Bet ID: ${docRef.id}` 
      });
      
      clearSlip();
      router.push('/betting-log');

    } catch (error) {
      console.error("Error saving bet to Firebase:", error);
      toast.error("There was an error saving your bet. Please try again.");
    }
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
