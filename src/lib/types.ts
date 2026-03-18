// src/lib/types.ts
import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────
export const BonusSchema = z.object({
  id: z.string(),
  name: z.string(),
  boost: z.number(),
  betType: z.string(),
  maxWager: z.number(),
  expirationDate: z.any(),
  description: z.string().optional(),
  winLogic: z.string().optional(),
  status: z.enum(['active', 'used', 'expired']),
  usedAt: z.any().optional(),
  createdAt: z.any().optional(),
  book: z.enum(['draftkings', 'fanduel', 'betmgm', 'caesars', 'custom']).optional(),
  eligibleTypes: z.array(z.string()).default([]),
  minOdds: z.string().optional(),
});


// ─── Inferred Types ─────────────────────────────────────────────────────────────
export type Bonus = z.infer<typeof BonusSchema>;


// ─── Core prop as stored in Firestore ────────────────────────────────────────
export interface NFLProp {
  id?:      string;
  player:   string;
  prop:     string;
  line:     number;
  team:     string;
  matchup:  string;
  gameDate: string;
  gameTime?: string;

  overUnder?:   'Over' | 'Under';
  odds?:        number;
  fdOdds?:      number | null;
  dkOdds?:      number | null;
  bestOdds?:    number | null;
  bestBook?:    string | null;

  isManual?:    boolean;
  season?:      number;
  week?:        number;
  expertStars?: number;

  // Enrichment — player stats
  playerAvg?:         number | null;
  seasonHitPct?:      number | null;

  // Enrichment — defense
  opponentRank?:      number | null;
  opponentAvgVsStat?: number | null;

  // Scoring model (columns L–AB)
  yardsScore?:        number | null;
  rankScore?:         number | null;
  totalScore?:        number | null;
  scoreDiff?:         number | null;
  scalingFactor?:     number | null;
  winProbability?:    number | null;
  projWinPct?:        number | null;
  avgWinProb?:        number | null;
  impliedProb?:       number | null;
  bestEdgePct?:       number | null;
  expectedValue?:     number | null;
  kellyPct?:          number | null;
  valueIcon?:         string | null;
  confidenceScore?:   number | null;

  // Post-game
  gameStat?:      number | null;
  actualResult?:  'won' | 'lost' | 'push' | 'pending' | null;
}

// ─── Normalized prop returned from API (camelCase, always has id) ────────────
export interface NormalizedProp extends NFLProp {
  id: string;   // required after normalization
}

// ─── Bet slip leg ─────────────────────────────────────────────────────────────
export interface BetLeg {
  id:        string;
  propId?:   string;
  player:    string;
  prop:      string;
  line:      number;
  team?:     string;
  matchup?:  string;
  selection: 'Over' | 'Under';
  odds?:     number;
  gameDate?: string;
  week?:     number;
  season?:   number;
  status?:   'pending' | 'won' | 'lost' | 'push';
  book?: string;
  bestBook?: string;
}

// ─── Bet slip item (leg + metadata) ──────────────────────────────────────────
export interface BetSlipItem {
  prop:      NormalizedProp;
  betAmount: number;
  overUnder: 'Over' | 'Under';
  odds?:     number;
}

// ─── Sort key (for table column sorting) ─────────────────────────────────────

// ─── Defense map (used by enrichment scripts) ─────────────────────────────────
export interface DefenseMap {
  [team: string]: {
    [propType: string]: {
      rank: number;
      avg:  number;
    };
  };
}

// ─── PropRow (raw Firestore row before normalization) ─────────────────────────
export interface PropRow extends NFLProp {
  id: string;
  [key: string]: any; // allow PascalCase Firestore fields
}

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

export function resolveFirestoreDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  if (typeof date === 'string' || typeof date === 'number') return new Date(date);
  return null;
}
export interface Bet {
  id: string;
  stake: number;
  odds: number;
  type: 'straight' | 'parlay' | 'teaser';
  status: 'pending' | 'won' | 'lost' | 'void';
  toWin: number;
  placedAt: any;
  bonusId?: string; // Track which bonus was used
  appliedBoost?: number; // Store the boost % at time of bet
  legs: {
    propId: string;
    player: string;
    prop: string;
    line: number;
    selection: 'Over' | 'Under';
    odds: number;
    gameStat?: number;
    actualResult?: string;
  }[];
}

export interface Wallet {
  bankroll: number;
  bonusBalance: number;
  lastUpdated?: string;
  uid: string;
}
