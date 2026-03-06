// src/lib/types.ts

// ─── Shared Primitives ────────────────────────────────────────────────────────
/**
 * Added 'cashed' to fix the "no overlap" comparison errors in EditBetModal.
 * This ensures that when you check if (status === 'cashed'), TypeScript 
 * recognizes it as a valid member of the union.
 */
export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashed';
export type BetType   = 'Single' | 'Parlay';
export type DefenseMap = Record<string, { rank: number; avg: number }>;
export type SortDir = 'asc' | 'desc'; 
export type SortKey =
  | 'player' | 'Player'
  | 'prop'   | 'Prop'
  | 'line'   | 'Line'
  | 'week'   | 'Week'
  | 'odds'   | 'Odds'
  | 'overOdds' | 'underOdds'
  | 'seasonHitPct' | 'projWinPct' | 'avgWinProb'
  | 'bestEV' | 'bestEdgePct' | 'confidenceScore';

// ─── BetLeg ───────────────────────────────────────────────────────────────────
export interface BetLeg {
  id:         string;
  player:     string;
  prop:       string;
  line:       number;
  selection:  string;
  odds:       number;
  matchup:    string;
  status:     string;
  gameDate:   string | null;
  team:       string;
  // Extended fields for manual entry and deep tracking
  week?:      number | null;
  season?:    number; // Fixed: Error 2353 in ManualEntryModal
  overUnder?: string;
  propId?:    string;
  betType?:   string;
  isLive?:    boolean;
  stake?:     number;
  source?: 'manual' | 'api' | 'historical-props'; // Add 'historical-props' here
}

// ─── Bet ──────────────────────────────────────────────────────────────────────
export interface Bet {
  id: string;
  userId: string;
  type: string;
  stake: number;
  odds: number;
  status: BetStatus; 
  gameDate: string;
  week: number;
  isBonusBet?: boolean;
  isBonusBetUsed?: boolean; // Fixed: Error 2551 in EditBetModal
  boost?: number;
  legs: BetLeg[]; // Typed specifically to resolve sub-property errors
  betType?:   string;
  createdAt?: any;
  updatedAt?: any;
  payout?:        number | null;
  isGhostParlay?: boolean;
  cashedAmount?:  number | null;
  manualOdds?:    number | null;
}

// ─── BetSlipItem ──────────────────────────────────────────────────────────────

export interface BetSlipItem {
  prop: NFLProp & { id: string };
  betAmount: number;
  overUnder: 'Over' | 'Under';
  odds: number;
}

// ─── BetResult ────────────────────────────────────────────────────────────────

export interface BetResult {
  id:      string;
  status:  BetStatus;
  profit:  number;
  stake:   number;
  date:    string;
  week?:   number;
}

// ─── PropData ─────────────────────────────────────────────────────────────────
// camelCase = canonical. PascalCase optionals = raw Firestore field names.

export interface PropData {
  id:          string;
  player:      string;
  prop:        string;
  line:        number;
  overOdds?:   number;
  underOdds?:  number;
  odds?:       number;   // generic fallback odds field
  team?:       string;
  matchup?:    string;
  week?:       number;
  gameDate?:   string;
  gameTime?:   string;
  overUnder?: 'Over' | 'Under' | string;
  season?:     number | string;
  // PascalCase aliases — Firestore raw field names
  Player?:         string;
  Prop?:           string;
  Line?:           number;
  Matchup?:        string;
  Team?:           string;
  Week?:           number;
  GameDate?:       string;
  GameTime?:       string;
  Odds?:           number;
  'Over/Under?': 'Over' | 'Under' | string;
}

// ─── WeeklyProp ───────────────────────────────────────────────────────────────

export interface WeeklyProp extends PropData {
  category?: string;
  overunder?: string;
  Odds?:      number;
}

export interface NFLProp {
  id?:          string;
  player?:      string;
  Player?:      string; 
  prop?:        string;
  Prop?:        string;   
  line?:        number;
  Line?:        number;   
  odds?:        number; 
  Odds?:        number; 
  team?:        string;
  Team?:        string;   
  matchup?:     string;
  Matchup?:     string; 
  week?:        number;
  season?:      string;
  gameDate?:    string;
  gameTime?:    string;
  overUnder?:   string;
  overOdds?:    number;
  underOdds?:   number;
  fdOdds?:      number;
  dkOdds?:      number;
  bestOdds?:    number;
  bestBook?:    string;
  bestEV?:      number;
  bestEdgePct?:     number;
  bestImpliedProb?: number;
  bestKellyPct?:    number;
  valueIcon?:       string;
  confidenceScore?: number;
  playerAvg?:         number;
  opponentRank?:      number;
  opponentAvgVsStat?: number;
  seasonHitPct?:      number;
  projWinPct?:        number;
  avgWinProb?:        number;
  gameStat?:          number;
  actualResult?:      'won' | 'lost' | 'push' | 'pending';
  expertPick?:      string | null;
  expertStars?:     number;
  updatedAt?:       string;
}

// ─── PFRGame ──────────────────────────────────────────────────────────────────

export interface PFRGame {
  player:    string;
  week:      number;
  season:    number;
  stat:      string;
  value:     number;
  opponent?: string;
  gameDate?: string;
}

// ─── PropRow ──────────────────────────────────────────────────────────────────

export interface PropRow {
  id:        string;
  player:    string;
  prop:      string;
  line:      number;
  result?:   string;
  week?:     number;
  season?:   number;
  matchup?:  string;
  gameDate?: string;
}

// ─── Prop (alias) ─────────────────────────────────────────────────────────────

export type Prop = PropData;

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id:            string;
  userId:        string;
  balance:       number;
  bonusBalance?: number;
  updatedAt?:    string;
  lastUpdated?:  string;
}

// ─── Bonus ────────────────────────────────────────────────────────────────────

export interface Bonus {
  id:     string;
  name:   string;
  type:   string;
  active: boolean;
  status?:          string;
  boost?:           number;
  betType?:         BetType | 'any';
  maxWager?:        number;
  description?:     string;
  expirationDate?: Date | string | { toDate: () => Date };
  startDate?:       string;
  endDate?:         string;
  createdAt?:       string;
  isExpired?:       boolean;
  usedAt?:          Date | string | null;
}

// ─── Firestore date helper ────────────────────────────────────────────────────

export type FirestoreDate = Date | string | { toDate: () => Date } | null | undefined;

export function resolveFirestoreDate(val: FirestoreDate): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') { 
    const d = new Date(val); 
    return isNaN(d.getTime()) ? null : d; 
  }
  if (typeof (val as any).toDate === 'function') return (val as any).toDate();
  return null;
}
