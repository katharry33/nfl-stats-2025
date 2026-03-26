// src/lib/enrichment/types.ts
// Re-export shared types + enrichment-specific types

export type { NFLProp, DefenseMap, PropRow } from '@/lib/types';

// ─── PFRGame (NFL) ───────────────────────────────────────────────────────────
export interface PFRGame {
  week: number;
  date: string;
  passAtt: number;
  passYds: number;
  passTds: number;
  passCmp: number;
  rushAtt: number;
  rushYds: number;
  rushTds: number;
  receptions: number;
  recYds: number;
  recTds: number;
  targets: number;
}

// ─── BRGame (NBA) ────────────────────────────────────────────────────────────
// Basketball Reference game log row — NBA equivalent of PFRGame.
export interface BRGame {
  gameNum: number;
  date: string;
  mp: string; // Minutes Played
  pts: number;
  ast: number;
  reb: number; // Mapping to 'trb' in scraper
  stl: number;
  blk: number;
  tov: number;
  fg3m: number;
  // Optional Advanced Stats (Prevents "Missing Property" Errors)
  orb?: number;
  drb?: number;
  fgm?: number;
  fga?: number;
  fg3a?: number;
  ftm?: number;
  fta?: number;
  plus_minus?: number;
}

// ─── BRIdMapEntry ─────────────────────────────────────────────────────────────
// Shape of a document in the static_brIdMap Firestore collection.
export interface BRIdMapEntry {
  player: string;
  brid: string;
  updatedAt: string; // ISO timestamp
}