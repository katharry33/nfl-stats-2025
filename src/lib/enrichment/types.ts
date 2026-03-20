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
  targets:    number;
}

// ─── BRGame ───────────────────────────────────────────────────────────────────
// Basketball Reference game log row — NBA equivalent of PFRGame.
export interface BRGame {
  /** The Nth game this player has appeared in this season (data-stat="game_season"). */
  gameNum: number;
  /** ISO date string "YYYY-MM-DD" parsed from data-stat="date_game". */
  date:    string;

  pts:  number;   // points
  ast:  number;   // assists
  reb:  number;   // total rebounds (trb)
  orb:  number;   // offensive rebounds
  drb:  number;   // defensive rebounds
  stl:  number;   // steals
  blk:  number;   // blocks
  tov:  number;   // turnovers
  fg3m: number;   // 3-pointers made  (data-stat="fg3")
  fg3a: number;   // 3-pointers attempted
  fgm:  number;   // field goals made
  fga:  number;   // field goals attempted
  ftm:  number;   // free throws made
  fta:  number;   // free throws attempted

  /** Raw minutes string e.g. "35:22". Empty = inactive / DNP. */
  mp: string;
}

// ─── BRIdMapEntry ─────────────────────────────────────────────────────────────
// Shape of a document in the static_brIdMap Firestore collection.
export interface BRIdMapEntry {
  player:    string;
  brid:      string;
  updatedAt: string; // ISO timestamp
}