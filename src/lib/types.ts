// src/lib/types.ts

export type BetType = 'Single' | 'Parlay' | 'SGP' | 'Teaser';
export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashed out' | 'push';
export type LegStatus = 'pending' | 'won' | 'lost' | 'void' | 'push';
export type Selection = 'Over' | 'Under';

export interface BetLeg {
  id: string;
  propId?: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  selection: Selection;
  odds: number;
  matchup?: string;
  week?: number;
  status: LegStatus;
  source?: string;
  gameDate: string | null;
}

export interface Bet {
  id: string;
  userId: string;
  betType: BetType;
  stake: number;
  odds: number;
  status: BetStatus;
  legs: BetLeg[];
  createdAt: Date | any;
  updatedAt?: Date | any;
  date?: Date | any;
  manualDate?: string;
  isLive?: boolean;
  isBonus?: boolean;
  boost?: boolean;
  boostPercentage?: number;
  payout?: number; // Legacy field for backwards compatibility
  potentialPayout?: number;
  actualPayout?: number;
  result?: string;
  parlayid?: string; // For grouping parlay bets together
  cashedOutAmount?: number;
}

export type BetSubmissionData = Omit<Bet, "id" | "userId" | "payout" | "createdAt">;

export interface BetResult {
  won: boolean;
  payout: number;
  status?: BetStatus;
}

export interface Bonus {
  id: string;
  userId: string;
  name?: string;
  type: string;
  amount: number;
  description?: string;
  expiresAt?: Date | any;
  expirationDate?: Date | any;
  createdAt: Date | any;
  used?: boolean;
  usedAt?: Date | any;
  status?: string;
  boost?: number;  // Changed to just number (not boolean)
  betType?: string;
  maxWager?: number;
  isExpired?: boolean;
  startDate?: Date | any;
  endDate?: Date | any;
}

export interface PropData {
  id?: string;
  Player?: string;
  player?: string;
  Team?: string;
  team?: string;
  Prop?: string;
  prop?: string;
  Line?: number;
  line?: number;
  Odds?: number;
  odds?: number;
  Week?: number;
  week?: number;
  Matchup?: string;
  matchup?: string;
  GameDate?: string;
  gameDate?: string;
  GameTime?: string;
  overOdds?: number;
  underOdds?: number;
  'Over/Under?'?: string;
  overunder?: string;
  league?: string;
}

export interface WeeklyProp {
  id?: string;
  Player?: string;
  player?: string;
  Team?: string;
  team?: string;
  Prop?: string;
  prop?: string;
  Line?: number;
  line?: number;
  Week?: number;
  week?: number;
  Matchup?: string;
  matchup?: string;
  Odds?: number;
  odds?: number;
  overunder?: string;
  'Over/Under?'?: string;
  GameDate?: string;
  gameDate?: string;
}

export interface SearchCriteria {
  season?: string;
  week?: number | string;
  team?: string;
  player?: string;
  prop?: string;
  matchup?: string;
}

export interface ScheduleEntry {
  id?: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  gameTime?: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  bonusBalance: number;
  updatedAt?: Date | any;
  lastUpdated?: Date | any;
}

// Legacy type aliases for backwards compatibility
export type Prop = PropData;
export type PropRow = PropData;

// Auth type for useAuth hook
export interface Auth {
  user: any;
  loading: boolean;
  error?: Error;
}

// BetSlip Context Type
export interface BetSlipContextType {
  selections: BetLeg[];
  addLeg: (leg: BetLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;  // Changed from clearSelections to match actual context
  updateLeg: (id: string, updates: Partial<BetLeg>) => void;
  submitBet: (betData: Omit<Bet, "createdAt" | "userId" | "id" | "payout">) => Promise<void>;
}
