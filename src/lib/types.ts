export interface BetLeg {
  id?: string;
  player: string;
  prop: string;
  line: number | string;
  odds?: number | string;
  result?: 'won' | 'lost' | 'push' | 'pending' | '';
  status?: string; 
  matchup?: string;
}

export interface Bet {
  id: string;
  userId?: string;
  type?: 'Single' | 'Parlay';
  betType?: 'Single' | 'Parlay'; // Added to fix the BetsTable error
  stake: number;
  odds: number | string;
  potentialPayout?: number;
  profit?: number;
  notes?: string;
  status: string;
  createdAt: any;
  week?: number | string;
  legs: BetLeg[];
  isBonusBet?: boolean;
  boost?: string | null;
  boostPct?: number | null;
  betAmount?: number;
}

export interface BetslipContextType {
  selections: BetLeg[];
  bets: Bet[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  
  fetchBets: (search?: string, isLoadMore?: boolean) => Promise<void>;
  loadMoreBets: () => Promise<void>;
  addLeg: (leg: any) => void;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  updateLeg: (legId: string, updates: Partial<BetLeg>) => void;
  submitBet: (bet: Partial<Bet>) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  updateBet: (id: string, updates: Partial<Bet>) => Promise<void>;
}