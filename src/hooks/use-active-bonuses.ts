'use client';
// hooks/use-active-bonuses.ts

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { bonusConverter } from '@/lib/firebase/converters';
import type { Bonus, BetLeg } from '@/lib/types';

export function useActiveBonuses(currentLegs: BetLeg[]) {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'bonuses').withConverter(bonusConverter),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(q, snapshot => {
      const activeBonuses = snapshot.docs.map(doc => doc.data());
      setBonuses(activeBonuses);
    });
    return () => unsub();
  }, []);

  const eligible = useMemo(() => {
    if (!currentLegs.length) return [];

    return bonuses.filter(bonus => {
      const { eligibleTypes = [], minOdds, book } = bonus;

      const typeMatch = !eligibleTypes.length || 
        (currentLegs.length === 1 && eligibleTypes.includes('Single')) ||
        (currentLegs.length > 1 && eligibleTypes.includes('Parlay'));

      const oddsMatch = !minOdds || currentLegs.every(leg => {
        const legOdds = leg.odds ?? 0;
        const min = parseInt(minOdds, 10);
        if (isNaN(min)) return true;

        if (min < 0) return legOdds <= min;
        return legOdds >= min;
      });

      const bookMatch = !book || book === 'custom' || currentLegs.every(leg => {
        // Assuming you store which book was selected for the leg
        // or checking if that leg is available on that book
        return leg.book === book || leg.bestBook?.toLowerCase() === book.toLowerCase();
      });

      return bookMatch && typeMatch && oddsMatch;
    });
  }, [bonuses, currentLegs]);

  return { all: bonuses, eligible };
}
