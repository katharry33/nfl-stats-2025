import { Timestamp } from 'firebase-admin/firestore';

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

export interface NormalizedProp {
  id: string;
  player: string;
  prop: string;
  line: number;
  overUnder: 'Over' | 'Under';
  matchup: string;
  team: string;
  opponent: string;
  gameDate: string;
  season: number;
  week?: number | null;
  league: 'nba' | 'nfl';
  // Add any other fields you're using (e.g., playerAvg, diff, etc.)
  [key: string]: any; 
}

export interface Bet extends NormalizedProp {
  // Fields made optional to accommodate historical market data
  userId?: string; 
  status?: 'pending' | 'won' | 'lost' | 'void' | 'cashed' | 'push';
  odds?: number | string; // Keep flexible as API sometimes returns strings
  stake?: number;
  
  // Optional metadata for tracked wagers
  payout?: number;
  cashOutAmount?: number | null;
  createdAt?: string;
  isBonusBet?: boolean;
  isGhostParlay?: boolean;
  
  // For parlays
  legs?: any[]; 
}

// Keeping your existing scoring types if they were here
export interface ScoringCriteria {
  [key: string]: any;
}

// Also fix the DefenseMap error
export type DefenseMap = Record<string, any>;