
// src/lib/types.ts - Add missing fields and fix types
export interface BetLeg {
  id: string;
  player: string;
  prop: string;
  line: number;
  selection?: 'Over' | 'Under';
  odds: number;
  matchup?: string;
  team?: string;
  week?: number;
  propId?: string;
  status?: 'won' | 'lost' | 'pending';
  source?: string;
}

export interface Bet {
  id: string;
  userId: string;
  stake: number;
  odds: number;
  betType: string;
  status: string;
  legs: BetLeg[];
  createdAt?: any;
  updatedAt?: any;
  boost?: boolean;
  boostPercentage?: number;
  isBonus?: boolean;
  isLive?: boolean;
  potentialPayout?: number;
  date?: string;
}

export interface Bonus {
  id: string;
  name: string;
  amount: number;
  expirationDate: Date | any;
  minOdds?: number;
  maxStake?: number;
  betTypes?: BetType[];
  isActive: boolean;
  used: boolean; // ADDED
  // Additional fields
  status?: string;
  boost?: number;
  betType?: BetType | 'any';
  maxWager?: number;
  description?: string;
  usedAt?: any;
  isExpired?: boolean;
  startDate?: any;
  endDate?: any;
  createdAt?: any;
  updatedAt?: any;
}

export type BetType = 'straight' | 'parlay' | 'sgp' | 'sgpx' | 'moneyline' | 'spread' | 'anytime_td' | 'teaser' | 'any';

export interface BetResult {
  date: string;
  won: number;
  lost: number;
  profit: number;
  status?: 'won' | 'lost' | 'push' | 'void' | 'pending'; // ADDED status
}

export interface PropData {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  odds: number;
  week?: number;
  matchup?: string;
  Player?: string;
  Team?: string;
  Prop?: string;
  Line?: number;
  Odds?: number;
  Week?: number;
  Matchup?: string;
  GameDate?: string; // ADDED
  GameTime?: string;
  overOdds?: number;
  underOdds?: number;
  'Over/Under?'?: string;
}

export interface WeeklyProp {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  week: number;
  odds?: number;
  matchup?: string;
  Player?: string;
  Team?: string;
  Prop?: string;
  Line?: number;
  Week?: number;
  Odds?: number;
  Matchup?: string;
  overunder?: string;
  'Over/Under?'?: string;
}

export interface Prop {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  odds: number;
  week?: number;
  matchup?: string;
  gameDate?: string;
  Player?: string;
  Team?: string;
  Prop?: string;
  Line?: number;
  Odds?: number;
  Week?: number;
  Matchup?: string;
  GameDate?: string;
}

export interface ScheduleEntry {
  id: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  gameTime: string;
}

export interface SearchCriteria {
  week?: number;
  team?: string;
  player?: string;
  prop?: string;
  matchup?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  bonusBalance: number;
  updatedAt?: any;
  lastUpdated?: any;
}

export interface PropRow {
  player: string;
  team: string;
  prop: string;
  line: number;
  odds: number;
  matchup?: string;
  week?: number;
  Player?: string;
  Team?: string;
  Prop?: string;
  Line?: number;
  Odds?: number;
  Week?: number;
  Matchup?: string;
}
