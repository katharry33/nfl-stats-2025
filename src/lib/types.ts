export type BetStatus = 'won' | 'lost' | 'pending' | 'void' | 'push';

export interface BetLeg {
  id: string;
  propId: string;
  player: string;
  prop: string;
  line: string | number;
  selection: string;
  odds: number;
  status: BetStatus;
  matchup?: string;
  team?: string;
  week?: number | string; // Add this line here
}

export interface Bet {
  id: string;
  userId: string;
  createdAt: Date;
  status: BetStatus;
  stake: number;
  odds: number;
  payout: number;
  betType: string;
  boost: boolean;
  legs: BetLeg[];
  boostPercentage?: number; 
  isLive?: boolean; 
}