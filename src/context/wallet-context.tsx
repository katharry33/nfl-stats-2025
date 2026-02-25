'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WalletState {
  bankroll: number;
  bonusBalance: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [bankroll, setBankroll] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet');
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }
      const data = await response.json();
      setBankroll(data.bankroll || 0);
      setBonusBalance(data.bonusBalance || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <WalletContext.Provider value={{ bankroll, bonusBalance, loading, error, refetch: fetchWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
