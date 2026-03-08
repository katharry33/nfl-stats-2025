// src/lib/types.ts

// ─── Shared Primitives ────────────────────────────────────────────────────────
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
  id: string;
  player: string;
  prop: string;
  line: number;
  selection: 'Over' | 'Under';
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  team: string;
  matchup: string;
  gameDate: string;
  source?: string;
  isLive?: boolean;
}

// ─── Bet ──────────────────────────────────────────────────────────────────────
export interface Bet {
  id: string;
  userId: string;
  type: string;
  status: 'pending' | 'won' | 'lost' | 'void' | 'cashed';
  stake: number;
  odds: number;
  payout: number;
  cashOutAmount?: number;
  gameDate: string;
  week: number;
  isParlay: boolean;
  legs: BetLeg[];
  isBonusBet?: boolean;
  boost?: number;
  createdAt?: any;
  updatedAt?: any;
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

export interface PropData {
  id:         string;
  player:     string;
  prop:       string;
  line:       number;
  overOdds?:  number;
  underOdds?: number;
  odds?:      number;
  team?:      string;
  matchup?:   string;
  week?:      number;
  gameDate?:  string;
  gameTime?:  string;
  overUnder?: 'Over' | 'Under' | string;
  season?:    number | string;
  // PascalCase aliases
  Player?:        string;
  Prop?:          string;
  Line?:          number;
  Matchup?:       string;
  Team?:          string;
  Week?:          number;
  GameDate?:      string;
  GameTime?:      string;
  Odds?:          number;
  'Over/Under?':  'Over' | 'Under' | string;
}

// ─── WeeklyProp ───────────────────────────────────────────────────────────────

export interface WeeklyProp extends PropData {
  category?: string;
  overunder?: string;
  Odds?:      number;
}

// ─── NFLProp ──────────────────────────────────────────────────────────────────

/** Canonical result values — lowercase to match Firestore convention */
export type PropResult = 'won' | 'lost' | 'push' | 'pending';

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
  // season accepts both number (scripts) and string (legacy Firestore docs)
  season?:      number | string;
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
  /** Lowercase result — set by postGame.ts after game completes */
  actualResult?:  PropResult;
  expertPick?:    string;
  expertStars?:   number;
  /** Set by loadProps.ts / useBetSlip */
  betAmount?:     number;
  /** Set by postGame.ts */
  profitLoss?:    number;
  updatedAt?:     string;
}

// ─── PFRGame (Firestore flat doc shape) ──────────────────────────────────────
// For the enrichment-specific game log shape, see lib/enrichment/types.ts

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