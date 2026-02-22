export type BetType = 'Single' | 'Parlay' | 'SGP' | 'SGP3' | 'Teaser'; // Added SGP3 for DK
export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashed out' | 'push';
export type LegStatus = 'pending' | 'won' | 'lost' | 'void' | 'push';
// Widened Selection to allow uppercase and dashes for DK/Legacy compatibility
export type Selection = 'Over' | 'Under' | 'OVER' | 'UNDER' | string; 

export interface BetLeg {
  id: string;
  propId?: string;
  player: string;
  team: string;
  prop: string;
  line: number | string; // Widened to string to prevent NaN on "Under 215.5" imports
  selection: Selection;
  odds: number | string;
  matchup?: string;
  week?: number | string;
  status: LegStatus;
  source?: string;
  gameDate: any; // Flexible for Timestamps or Strings
  playerteam?: string; // Added for DK compatibility
  result?: string;     // Added for DK compatibility
}

export interface Bet {
  id: string;
  userId: string;
  betType: BetType;
  stake: number;
  wager?: number; // Added as optional alias to fix betting-stats.tsx error
  odds: number | string;
  status: BetStatus;
  legs: BetLeg[];
  createdAt: any; 
  updatedAt?: any;
  date?: any;
  manualDate?: string;
  isLive?: boolean;
  isBonus?: boolean;
  boost?: string | boolean; 
  boostPercentage?: number;
  payout?: number; 
  potentialPayout?: number;
  actualPayout?: number;
  result?: string;
  parlayid?: string; 
  cashedOutAmount?: number;
  cashedAmount?: number; // Alias for different data sources
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
