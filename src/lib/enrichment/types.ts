// src/lib/enrichment/types.ts
// Re-export shared types + enrichment-specific types

export type { NFLProp, DefenseMap, PropRow } from '@/lib/types';

// ─── PFRGame ──────────────────────────────────────────────────────────────────
export interface PFRGame {
  week:       number;
  date:       string;
  passAtt:    number;
  passYds:    number;
  passTds:    number;
  passCmp:    number;
  rushAtt:    number;
  rushYds:    number;
  rushTds:    number;
  receptions: number;
  recYds:     number;
  recTds:     number;
}