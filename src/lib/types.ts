// src/lib/types.ts
// -----------------------------------------------------------------------------
//  CORE TYPES FOR INGESTION, ENRICHMENT, SCORING, BETTING, AND UI
// -----------------------------------------------------------------------------

import { Timestamp } from 'firebase-admin/firestore';

// -----------------------------------------------------------------------------
// BETTING TYPES (unchanged, still correct)
// -----------------------------------------------------------------------------

export interface BetLeg {
  id?: string;
  player?: string;
  prop?: string;
  line?: number;
  odds?: number;
  status?: 'pending' | 'won' | 'lost' | 'void';
  gameDate?: string;
  league?: string;
}

export interface Bet {
  id: string;
  userId: string;
  uid?: string;
  status: 'pending' | 'win' | 'loss' | 'push' | 'cashed';
  odds: number;
  stake: number;
  payout?: number;
  isBonusBet?: boolean;
  boost?: string | number;
  gameDate?: string;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
  legs?: BetLeg[];
  actualResult?: 'won' | 'lost' | 'pending';
  week?: string | number;
  season?: number;
}

// -----------------------------------------------------------------------------
// DEFENSE MAP (corrected shape)
// -----------------------------------------------------------------------------

export type DefenseMap = Record<
  string, // key: `${propNorm}||${TEAM}`
  { rank: number; avg: number }
>;

// -----------------------------------------------------------------------------
// INGESTED PROP TYPES (NBA + NFL)
// These represent the Firestore documents created by /api/*/ingest
// -----------------------------------------------------------------------------

export interface BasePropDoc {
  id: string;
  uploadId: string;
  rowHash: string;

  rawRow: any;
  ingestMeta: {
    ingestedAt: string;
    source: string;
  };

  player: string;
  team: string | null;
  opponent: string | null;

  prop: string;
  propNorm: string;
  line: number;
  overUnder: string;

  odds: number;
  impliedProb: number;

  gameDate: string;
  season: number;
  league: 'nba' | 'nfl';

  status: 'pending' | 'enriched' | 'error';
  enriched: boolean;
  lastEnriched?: string;
}

// NBA-specific fields (if needed later)
export interface NBAPropDoc extends BasePropDoc {
  league: 'nba';
}

// NFL-specific fields (if needed later)
export interface NFLPropDoc extends BasePropDoc {
  league: 'nfl';
  week?: number | null;
}

// -----------------------------------------------------------------------------
// ENRICHMENT OUTPUT FIELDS
// These are added to the Firestore doc during enrichment
// -----------------------------------------------------------------------------

export interface EnrichedFields {
  playerAvg?: number | null;
  seasonHitPct?: number | null;

  opponentRank?: number | null;
  opponentAvgVsStat?: number | null;

  modelProb?: number;
  expectedValue?: number;
  confidenceScore?: number;
  bestEdge?: number;
}

// -----------------------------------------------------------------------------
// FINAL PROP TYPE (what UI components consume)
// -----------------------------------------------------------------------------

export type PropDoc = BasePropDoc & EnrichedFields;

// -----------------------------------------------------------------------------
// UI TYPES
// -----------------------------------------------------------------------------

export interface PropCardViewProps {
  prop: PropDoc;
}
