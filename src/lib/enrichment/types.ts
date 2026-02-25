export interface NFLProp {
  // Core Data (Firestore PascalCase)
  id: string;
  Player: string;
  Team: string;
  Prop: string;
  Line: number;
  'Over/Under?': string;
  Matchup?: string;
  Week?: number;
  Season?: string;

  // Frontend/Enrichment Aliases (Lowercase)
  player?: string;
  team?: string;
  prop?: string;
  line?: number | string;
  overUnder?: 'Over' | 'Under';
  matchup?: string;
  week?: number;
  season?: string;

  // Enrichment & Analytics Fields
  bestOdds?: number;
  bestBook?: string;
  bestEV?: number;
  bestEdgePct?: number;
  bestImpliedProb?: number;
  avgWinProb?: number;
  projWinPct?: number;
  playerAvg?: number;
  seasonHitPct?: number;
  opponentRank?: number;
  opponentAvgVsStat?: number;
  valueIcon?: string;
  
  // Post-Game / Settlement Fields
  gameStat?: number;
  actualResult?: 'won' | 'lost' | 'push' | 'pending';
  profitLoss?: number;
  betAmount?: number;
  
  // External IDs
  pfrid?: string; // Pro Football Reference ID
}

// Add this to fix the "Module has no exported member 'DefenseMap'" error
export type DefenseMap = Record<string, { rank: number; avg: number }>;