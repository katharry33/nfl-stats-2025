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
// DEFENSE MAP
// -----------------------------------------------------------------------------

export type DefenseMap = Record<
  string, // key: `${propNorm}||${TEAM}`
  { rank: number; avg: number }
>;

// -----------------------------------------------------------------------------
// CANONICAL PROP DOCUMENT (used everywhere: ingestion, enrichment, UI)
// -----------------------------------------------------------------------------
export interface PropDoc {
  id: string;
  player: string;
  team: string;
  opponent?: string | null;
  prop: string;
  propNorm: string;
  line: number;
  overUnder?: 'over' | 'under' | null;
  odds?: number | null;
  impliedProb?: number | null;
  gameDate?: string | null;
  season: number;
  league: string;
  status?: string;
  enriched?: boolean;
  lastEnriched?: string | null;
  week?: number | null;

  // ⭐ Add these
  overOdds?: number | null;
  underOdds?: number | null;
  bestOdds?: number | null;
  bestBook?: string | null;
  confidenceScore?: number | null;
}


// -----------------------------------------------------------------------------
// UI TYPES
// -----------------------------------------------------------------------------

export interface PropCardViewProps {
  prop: PropDoc;
}

// -----------------------------------------------------------------------------
// ENRICHED PROP (UI + ENRICHMENT LAYER)
// -----------------------------------------------------------------------------

export type EnrichedProp = PropDoc & {
  matchup?: string;

  playerAvg?: number | null;
  modelProb?: number | null;
  seasonHitPct?: number | null;

  scoreDiff?: number | null;
  winProbability?: number | null;
  projWinPct?: number | null;

  opponentRank?: number | null;
  opponentAvgVsStat?: number | null;

  yardsScore?: number | null;
  totalScore?: number | null;
  rankScore?: number | null;
  scalingFactor?: number | null;

  actual?: number | null;
  result?: string | null;

  updatedAt?: string | null;
  lastPatched?: string | null;
  gameStats?: number | null;
  gameTime?: string | null;

  migratedFrom?: string | null;
};
