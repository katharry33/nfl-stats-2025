'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext'; // Using your existing auth

interface WalletState {
  bankroll: number;
  bonusBalance: number;
  loading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ bankroll: 0, bonusBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Real-time subscription to the user's wallet doc
    const unsub = onSnapshot(
      doc(db, 'wallets', user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setData({
            bankroll: d.balance || 0,
            bonusBalance: d.bonusBalance || 0
          });
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  return (
    <WalletContext.Provider value={{ ...data, loading, error }}>
      {children}
    </WalletContext.Provider>
  );
};