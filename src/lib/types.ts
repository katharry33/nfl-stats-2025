import type { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import type { Timestamp as ClientTimestamp } from 'firebase/firestore';

// ============================================================================
// CORE BETTING TYPES
// ============================================================================

// A flexible timestamp type that accounts for server, client, and serialization differences.
export type FlexibleTimestamp = AdminTimestamp | ClientTimestamp | Date | string;

export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'push' | 'hit' | 'miss';

export type BetType = 
  | 'straight' 
  | 'parlay' 
  | 'sgp' 
  | 'sgpx' 
  | 'moneyline' 
  | 'anytime_td' 
  | 'round_robin'
  | 'teaser';

export type BonusStatus = 'active' | 'used' | 'expired';

// ============================================================================
// PROP TYPES
// ============================================================================

// This interface is used for raw prop data, allowing for flexibility with dynamic keys.
export interface PropData {
  id: string;
  player: string;
  team: string;
  opponent?: string;
  prop: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameTime?: any;
  week?: number;
  matchup?: string;
  [key: string]: any;
}

// Represents the clean, normalized data structure for a prop.
export interface Prop {
  id: string;
  player: string;
  team: string;
  opponent?: string;
  prop: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameTime?: FlexibleTimestamp;
  gameDate?: string;
  week?: number;
  matchup?: string;
  league?: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  status?: 'active' | 'settled' | 'suspended';
  source?: string; 
}

// Represents the raw data structure for props as they come from a specific weekly source.
export interface WeeklyProp {
  id: string;
  Player: string;
  Prop: string;
  Line: number;
  Odds: number;
  overunder: 'Over' | 'Under' | string;
  Week: number;
  Team: string;
  Matchup: string;
  GameDate: FlexibleTimestamp;
}


// ============================================================================
// BET TYPES
// ============================================================================

export interface BetLeg {
  id: string;
  propId: string;
  player: string;
  prop: string;
  line: number;
  selection: 'Over' | 'Under';
  odds: number;
  status: 'won' | 'lost' | 'pending' | 'void';
  source?: 'manual' | 'betting-log' | 'api' | 'weekly-props' | 'weekly' | 'historical-props';
  week?: number | string;
  gameDate?: FlexibleTimestamp;
  matchup?: string;
  team?: string;
}

export interface Bet {
  id: string;
  uid?: string;
  userId?: string;
  createdAt: FlexibleTimestamp;
  updatedAt?: FlexibleTimestamp;
  _source?: any;
  status: BetStatus;
  stake: number;
  odds: number;
  payout?: number;
  potentialPayout?: number;
  settledAt?: FlexibleTimestamp;
  legs: BetLeg[];
  betType: BetType;
  boost: boolean;
  boostPercentage: number;
  isLive: boolean;
  isBonus?: boolean;
  date?: FlexibleTimestamp;
  selection?: 'Over' | 'Under';
  overUnder?: 'Over' | 'Under';
  player?: string;
  line?: number;
  prop?: string;
}

// Represents the lean object sent from the client to the server for creation.
export interface BetSubmission {
  userId: string;
  status: BetStatus;
  betType: BetType;
  stake: number;
  odds: number;
  legs: BetLeg[];
  createdAt: FlexibleTimestamp;
}

export interface BetResult {
  id: string;
  userId: string;
  betId: string;
  result: 'won' | 'lost' | 'push' | 'void';
  status?: BetStatus;
  stake: number;
  payout: number;
  profit: number;
  date: FlexibleTimestamp;
  betType: BetType;
  isBonus?: boolean;
  legs?: BetLeg[];
}

export interface BetRecord extends Bet {}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface BetSlipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  updateLeg: (id: string, updates: Partial<BetLeg>) => void;
  clearSelections: () => void;
  submitBet: () => Promise<void>;
}

// ============================================================================
// WALLET & BONUS TYPES
// ============================================================================

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  bonusBalance: number;
  lastUpdated: FlexibleTimestamp;
  updatedAt?: FlexibleTimestamp;
}

export interface Bonus {
  id: string;
  name: string;
  boost: number;
  betType: BetType | 'any';
  maxWager: number;
  maxBet?: number;
  minOdds?: number;
  expirationDate: FlexibleTimestamp;
  expiresAt?: FlexibleTimestamp;
  description?: string;
  status: BonusStatus;
  isExpired?: boolean;
  usedAt?: FlexibleTimestamp;
  usedInBetId?: string;
  createdAt: FlexibleTimestamp;
  updatedAt?: FlexibleTimestamp;
  [key: string]: any;
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export interface ScheduleEntry {
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: FlexibleTimestamp;
  week?: number;
  league?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'postponed';
  homeScore?: number;
  awayScore?: number;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface SearchCriteria {
  player?: string;
  prop?: string;
  gamedate?: string;
  matchup?: string;
  team?: string;
  week?: number | string;
  position?: string;
  league?: string;
  [key: string]: any;
}
