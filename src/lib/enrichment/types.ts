// src/lib/enrichment/types.ts
// Enrichment-specific types.
// Shared types (NFLProp, DefenseMap, etc.) are re-exported from lib/types
// so the rest of the app has a single source of truth.

export type {
    NFLProp,
    DefenseMap,
    PropRow,
  } from '@/lib/types';
  
  // ─── PFRGame ──────────────────────────────────────────────────────────────────
  // Shape returned by pfr.ts parsePfrGameLog().
  // Intentionally separate from the generic PFRGame in lib/types.ts,
  // which is a flattened Firestore document shape used by the UI.
  
  export interface PFRGame {
    week:        number;
    date:        string;
    // Passing
    passAtt:     number;
    passYds:     number;
    passTds:     number;
    passCmp:     number;
    // Rushing
    rushAtt:     number;
    rushYds:     number;
    rushTds:     number;
    // Receiving
    receptions:  number;
    recYds:      number;
    recTds:      number;
  }