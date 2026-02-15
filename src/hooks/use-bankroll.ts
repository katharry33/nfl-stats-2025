import { useState, useEffect } from 'react';
import { useFirestore } from '../lib/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';

export const useBankroll = () => {
  const [data, setData] = useState({ total: 0, inPlay: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const firestore = useFirestore();

  useEffect(() => {
    // 1. Guard: Wait for the Firestore instance to be initialized by the Provider
    if (!firestore) return;

    // 2. Wallet Listener (Total Balance)
    const unsubscribeWallet = onSnapshot(
      doc(firestore, "wallet", "main"), 
      (walletDoc) => {
        const total = walletDoc.exists() ? Number(walletDoc.data().balance || 0) : 0;
        
        setData(prev => {
          const available = total - prev.inPlay;
          return { ...prev, total, available };
        });
        setLoading(false);
      },
      (err) => {
        console.error("Wallet snapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // 3. In-Play Listener (Active Stakes)
    const unsubscribeInPlay = onSnapshot(
      doc(firestore, "wallet", "inPlay"), 
      (inPlayDoc) => {
        const inPlay = inPlayDoc.exists() ? Number(inPlayDoc.data().total || 0) : 0;
        
        setData(prev => {
          const available = prev.total - inPlay;
          return { ...prev, inPlay, available };
        });
      },
      (err) => {
        console.error("InPlay snapshot error:", err);
        setError(err);
      }
    );

    return () => {
      unsubscribeWallet();
      unsubscribeInPlay();
    };
  }, [firestore]); // 4. Dependency on firestore ensures listeners restart if the instance changes

  return { ...data, loading, error };
};