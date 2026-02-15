import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import type { Bonus } from '../lib/types';

export function useActiveBonuses() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDb: (() => void) | undefined = undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDb) {
        unsubscribeDb();
      }

      if (user) {
        setLoading(true);
        const q = query(
          collection(db, 'bonuses'),
          where('userId', '==', user.uid),
          where('status', '==', 'active')
        );

        unsubscribeDb = onSnapshot(q, (snapshot) => {
          const bonusData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
              id: doc.id,
              name: data.name,
              boost: data.boost,
              betType: data.betType || 'any',   // Ensure this is here
              maxWager: data.maxWager || 0,     // Ensure this is here
              status: data.status,
              expirationDate: data.expirationDate,
              isExpired: data.expirationDate ? data.expirationDate.toDate() < new Date() : false,
              // ... other fields
            } as Bonus;
          });
          
          setBonuses(bonusData);
          setLoading(false);
        }, (error) => {
            console.error("Error fetching bonuses:", error);
            setLoading(false);
        });
      } else {
        setBonuses([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) {
        unsubscribeDb();
      }
    };
  }, []);

  return bonuses;
}
