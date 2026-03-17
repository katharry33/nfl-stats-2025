'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface WalletState {
  bankroll: number;
  bonusBalance: number;
  loading: boolean;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [bankroll, setBankroll] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/wallet');
        if (!response.ok) {
          throw new Error('Failed to fetch wallet data');
        }
        const data = await response.json();
        setBankroll(data.bankroll || 0);
        setBonusBalance(data.bonusBalance || 0);
      } catch (error) {
        toast.error('Could not load wallet.', { 
          description: error instanceof Error ? error.message : 'Please try again later.\' 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const value = { bankroll, bonusBalance, loading };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
