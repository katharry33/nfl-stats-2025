import { Timestamp } from "firebase/firestore";

// ============================================================================
// CORE BETTING TYPES
// ============================================================================

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

export interface Prop {
  id: string;
  externalId?: string;
  playerName: string;
  team: string;
  opponent: string;
  category: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameTime: any;
  league: 'NFL' | 'NBA' | 'MLB' | 'NHL'; 
  status: 'active' | 'settled' | 'suspended';
  lastUpdated: any;
  week?: number;
}

export interface PropRow {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  odds: number;
  overunder: 'Over' | 'Under';
  gameDate?: string;
  [key: string]: any; 
}

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

export interface WeeklyProp extends PropData {
  Week: number; 
  week?: number; 
  gameDate?: string;
}

// ============================================================================
// BET TYPES
// ============================================================================

export interface BetLeg {
  id: string;
  player: string;
  prop: string;
  line: number;
  selection: 'Over' | 'Under';
  odds: number;
  matchup?: string;
  team?: string;
  week?: number;
  Week?: number;
  propId?: string;
  status?: 'won' | 'lost' | 'pending';
  source?: string; 
}

export interface Bet {
  id: string;
  uid?: string;      // Added for auth mapping
  userId?: string;   // Added to fix API route errors
  createdAt: any; 
  updatedAt?: any;
  _source?: any;
  status: BetStatus; // Updated to use the full BetStatus union
  stake: number;
  odds: number;
  potentialPayout?: number;
  legs: BetLeg[];
  betType: BetType;  // Updated to include 'straight', 'sgp', etc.
  boost: boolean; 
  boostPercentage: number; 
  isLive: boolean; 
  date?: string | Date;

  // Legacy fields for backwards compatibility
  selection?: 'Over' | 'Under';
  overUnder?: 'Over' | 'Under';
  player?: string;
  line?: number;
  prop?: string;
}

// Submission helper for when ID/CreatedAt aren't generated yet
export interface BetSubmission {
  status: BetStatus;
  stake: number;
  odds: number;
  legs: BetLeg[];
  betType: BetType;
  boost: boolean;
  boostPercentage: number;
  isLive: boolean;
  userId?: string;
}

// BetResult type (used in performance page and charts)
export interface BetResult {
  id: string;
  userId: string;
  betId: string;
  result: 'won' | 'lost' | 'push' | 'void';
  status?: BetStatus;
  stake: number;
  payout: number;
  profit: number;
  date: any;
  betType: BetType; // Synced with global BetType
  legs?: BetLeg[];
}

export interface BetRecord extends Bet {
  // This satisfies the import in parlay-studio
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface BetslipContextType {
  legs: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearLegs: () => void;
}

// ============================================================================
// WALLET & BONUS TYPES
// ============================================================================

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  bonusBalance: number;
  lastUpdated: any;
  updatedAt?: any;
}

export interface Bonus {
  id: string;
  name: string;
  boost: number;
  betType: BetType | 'any';
  maxWager: number;          // Existing
  maxBet?: number;           // Add for compatibility (fixes hook error)
  minOdds?: number;          // Add for compatibility
  expirationDate: Date | any;
  expiresAt?: any;           // Add for compatibility
  description?: string;
  status: BonusStatus;
  isExpired?: boolean;       // Add this (fixes utils.ts and firebase/bonuses.tsx)
  usedAt?: Date | any;
  usedInBetId?: string;
  createdAt: Date | any;
  updatedAt?: Date | any;
  [key: string]: any;        // Add index signature to handle any other fields
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export interface ScheduleEntry {
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: any;
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
