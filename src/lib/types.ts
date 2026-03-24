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

export interface Bet {
  id: string;
  userId: string;
  uid?: string; // For backwards compatibility
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
  actualResult?: 'won' | 'lost' | 'pending'; // For archive mode
  week?: string | number;
  season?: number;
}

// Keeping your existing scoring types if they were here
export interface ScoringCriteria {
  [key: string]: any;
}