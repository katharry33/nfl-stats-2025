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

export type Bonus = z.infer<typeof BonusSchema>;

// ─── Core prop as stored in Firestore ────────────────────────────────────────
export interface NFLProp {
  id?: string;
  player: string;
  prop: string;
  line: number;
  team: string;
  matchup: string;
  gameDate: string;
  gameTime?: string;
  league?: 'nfl' | 'nba';

  overUnder?: 'Over' | 'Under';
  odds?: number;
  
  // FIX: Added for PropCard visibility
  overOdds?: number | null;
  underOdds?: number | null;
  
  fdOdds?: number | null;
  dkOdds?: number | null;
  bestOdds?: number | null;
  bestBook?: string | null; // Unified to handle Firestore nulls

  isManual?: boolean;
  season?: number;
  week?: number;
  expertStars?: number;
  expertPick?: string;

  // Enrichment — player stats
  playerAvg?: number | null;
  seasonHitPct?: number | null;

  // Enrichment — defense
  opponentRank?: number | null;
  opponentAvgVsStat?: number | null;

  // Scoring model
  yardsScore?: number | null;
  rankScore?: number | null;
  totalScore?: number | null;
  scoreDiff?: number | null;
  scalingFactor?: number | null;
  winProbability?: number | null;
  projWinPct?: number | null;
  avgWinProb?: number | null;
  impliedProb?: number | null;
  bestEdgePct?: number | null;
  expectedValue?: number | null;
  kellyPct?: number | null;
  valueIcon?: string | null;
  confidenceScore?: number | null;

  // Post-game
  gameStat?: number | null;
  actualResult?: 'won' | 'lost' | 'push' | 'pending' | null;
  updatedAt?: string | number | Date;
  enrichedAt?: string | number | Date;
}

export interface NormalizedProp extends NFLProp {
  id: string;
}

// FIX: Exported for props-service.ts
export interface PropData {
  id: string;
  player: string;
  prop: string;
  line: number;
  odds: number;
  league: string;
  team?: string;
  matchup?: string;
  gameDate?: string;
  week?: number;
  season?: number;
  overUnder?: string;
  'over under'?: string; // Supporting the legacy field name
  isManual?: boolean;
  migratedFrom?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  lastPatched?: string;
}

// ─── Bet slip leg ─────────────────────────────────────────────────────────────
export interface BetLeg {
  id: string;
  propId: string;
  player: string;
  prop: string;
  line: number;
  team?: string;
  matchup?: string;
  selection: 'Over' | 'Under';
  odds: number;
  gameDate?: string;
  week?: number;
  season?: number;
  overUnder?: string | null;
  status?: 'pending' | 'won' | 'lost' | 'push';
  book?: string;
  bestBook?: string | null; // Match the prop type to avoid assignment errors
  league?: string;
}

export interface BetSlipItem {
  prop: NormalizedProp;
  betAmount: number;
  overUnder: 'Over' | 'Under';
  odds?: number;
}

export interface DefenseMap {
  [team: string]: {
    [propType: string]: {
      rank: number;
      avg: number;
    };
  };
}

export interface PropRow extends NFLProp {
  id: string;
  [key: string]: any; 
}

export function resolveFirestoreDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  if (typeof date === 'string' || typeof date === 'number') return new Date(date);
  return null;
}

export interface Wallet {
  bankroll: number;
  bonusBalance: number;
  lastUpdated?: string;
  uid: string;
}