// src/hooks/useSweetSpots.ts
// Hook only — no JSX. Components are in SweetSpotWrappers.tsx.

import { useState, useEffect, useCallback } from 'react';
import {
  fetchScoringCriteria,
  scoreProp,
  type ScoringCriteria,
  type PropSnapshot,
  type SweetSpotResult,
} from '@/lib/utils/sweetSpotScore';

// ─── Module-level cache so all hook instances share one fetch ─────────────────
let _globalCriteria: ScoringCriteria | null = null;
let _globalPromise:  Promise<ScoringCriteria | null> | null = null;

export function useSweetSpots() {
  const [criteria, setCriteria] = useState<ScoringCriteria | null>(_globalCriteria);

  useEffect(() => {
    if (_globalCriteria) { setCriteria(_globalCriteria); return; }
    if (!_globalPromise) _globalPromise = fetchScoringCriteria();
    _globalPromise.then(c => { _globalCriteria = c; setCriteria(c); });
  }, []);

  const score = useCallback(
    (prop: PropSnapshot): SweetSpotResult | null =>
      criteria ? scoreProp(prop, criteria) : null,
    [criteria],
  );

  return { criteria, score, ready: !!criteria };
}