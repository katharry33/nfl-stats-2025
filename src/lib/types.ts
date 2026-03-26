export interface PropData {
  id: string;
  player: string;
  team: string; // Logo URL
  prop: string;
  line: number;
  overUnder: string;
  matchup: string;
  week: number | null;
  gameDate: string | null;
  gameTime: string;
  season: number | null;
  league: 'nba' | 'nfl';

  // NBA Specific
  pace?: number;

  // Unified Analytics
  playerAvg: number;
  opponentRank: number;
  opponentAvgVsStat: number;
  yardsScore: number;
  rankScore: number;
  totalScore: number;
  scoreDiff: number;
  scalingFactor: number;
  winProbability: number;
  projWinPct: number;
  seasonHitPct: number;
  avgWinProb: number;
  odds: number;
  impliedProb: number;
  bestEdgePct: number;
  expectedValue: number;
  kellyPct: number;
  valueIcon: string;
  confidenceScore: number;
  gameStats: any; // Keep as any for now, since we don't have a type for this
  actualResult: string;
  updatedAt: string;
  enriched?: boolean;
}

export type NFLProp = PropData;
export type PropRow = any;
export type DefenseMap = Record<string, any>;
