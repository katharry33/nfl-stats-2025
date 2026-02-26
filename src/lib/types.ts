// src/lib/types.ts

// ─── Shared Primitives ────────────────────────────────────────────────────────
export type BetStatus = 'won' | 'lost' | 'push' | 'pending' | 'void';
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
  id:        string;
  player:    string;
  prop:      string;
  line:      number;
  selection: string;
  odds:      number;
  status:    BetStatus;
  matchup:   string;
  team?:      string;
  gameDate?:  string;
  overUnder?: string;
  week?:      number;
  propId?:    string;
  source?:    'weekly-props' | 'historical-props' | 'manual' | string;
  isLive?:    boolean;
}

// ─── Bet ──────────────────────────────────────────────────────────────────────

export interface Bet {
  id:        string;
  userId:    string;
  betType:   BetType;
  legs:      BetLeg[];
  odds:      number;
  stake:     number;
  payout?:   number;
  profit?:   number;
  status:    BetStatus;
  createdAt: string;
  week?:     number;
  isParlay:  boolean;
  date?:     string;
  gameDate?: string;
  notes?:    string;
  betAmount?:  number;
  parlayOdds?: number;
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
  id:         string;
  player:     string;
  prop:       string;
  line:       number;
  overOdds?:  number;
  underOdds?: number;
  odds?:      number;   // generic fallback odds field
  team?:      string;
  matchup?:   string;
  week?:      number;
  gameDate?:  string;
  gameTime?:  string;
  overUnder?: 'Over' | 'Under' | string;
  season?:    number | string;
  // PascalCase aliases — Firestore allProps_2025 raw field names
  Player?:        string;
  Prop?:          string;
  Line?:          number;
  Matchup?:       string;
  Team?:          string;
  Week?:          number;
  GameDate?:      string;
  GameTime?:      string;
  Odds?:          number;
  'Over/Under?': 'Over' | 'Under' | string;
}

// ─── WeeklyProp ───────────────────────────────────────────────────────────────

export interface WeeklyProp extends PropData {
  category?: string;
  // lowercase alias — weekly-props.tsx reads prop.overunder from Firestore
  overunder?: string;
  // WeeklyProp may come from Firestore with PascalCase Odds
  Odds?:      number;
}

// ─── NFLProp ──────────────────────────────────────────────────────────────────
// Used by enrichment pipeline. fdOdds/dkOdds are per-book accumulation values.

export interface NFLProp {
  id?:        string;
  player?:    string;
  prop?:      string;
  line?:      number;
  team?:      string;
  matchup?:   string;
  week?:      number;
  season?:    string;
  gameDate?:  string;
  gameTime?:  string;
  overUnder?: string;
  overOdds?:  number;
  underOdds?: number;
  fdOdds?:    number;
  dkOdds?:    number;
  bestOdds?:  number;
  bestBook?:  string;
  bestEV?:    number;
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
// firebase/wallet.ts uses `lastUpdated` — both fields optional so either works.

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
  status?:         string;
  boost?:          number;
  betType?:        BetType | 'any';
  maxWager?:       number;
  description?:    string;
  expirationDate?: Date | string | { toDate: () => Date };
  startDate?:      string;
  endDate?:        string;
  createdAt?:      string;
  isExpired?:      boolean;
  usedAt?:         Date | string | null;
}

// ─── Firestore date helper ────────────────────────────────────────────────────

export type FirestoreDate = Date | string | { toDate: () => Date } | null | undefined;

export function resolveFirestoreDate(val: FirestoreDate): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
  if (typeof (val as any).toDate === 'function') return (val as any).toDate();
  return null;
}
