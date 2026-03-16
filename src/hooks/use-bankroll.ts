'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/context/AuthContext';

// Define the shape of the data for TypeScript
interface BankrollData {
  total: number;
  bonusBalance: number;
  loading: boolean;
  error: Error | null;
}

export function useBankroll(): BankrollData {
  const { user } = useAuth();
  const [data, setData] = useState<Omit<BankrollData, 'loading' | 'error'>>({
    total: 0,
    bonusBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Subscribing to the wallet document
    const unsub = onSnapshot(
      doc(db, 'wallets', user.uid),
      (snap) => {
        if (snap.exists()) {
          const walletData = snap.data();
          setData({
            total: walletData.balance || 0,
            bonusBalance: walletData.bonusBalance || 0, // Critical Fix: Ensure this is mapped
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Bankroll Subscription Error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  return {
    ...data,
    loading,
    error,
  };
}