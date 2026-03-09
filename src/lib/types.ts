// src/lib/types.ts

// ─── Core prop as stored in Firestore ────────────────────────────────────────
export interface NFLProp {
  id?:      string;
  player:   string;
  prop:     string;
  line:     number;
  team:     string;
  matchup:  string;
  gameDate: string;
  gameTime?: string;

  overUnder?:   'Over' | 'Under';
  odds?:        number;
  fdOdds?:      number | null;
  dkOdds?:      number | null;
  bestOdds?:    number | null;
  bestBook?:    string | null;

  isManual?:    boolean;
  season?:      number;
  week?:        number;
  expertStars?: number;

  // Enrichment — player stats
  playerAvg?:         number | null;
  seasonHitPct?:      number | null;

  // Enrichment — defense
  opponentRank?:      number | null;
  opponentAvgVsStat?: number | null;

  // Scoring model (columns L–AB)
  yardsScore?:        number | null;
  rankScore?:         number | null;
  totalScore?:        number | null;
  scoreDiff?:         number | null;
  scalingFactor?:     number | null;
  winProbability?:    number | null;
  projWinPct?:        number | null;
  avgWinProb?:        number | null;
  impliedProb?:       number | null;
  bestEdgePct?:       number | null;
  expectedValue?:     number | null;
  kellyPct?:          number | null;
  valueIcon?:         string | null;
  confidenceScore?:   number | null;

  // Post-game
  gameStat?:      number | null;
  actualResult?:  'won' | 'lost' | 'push' | 'pending' | null;
}

// ─── Normalized prop returned from API (camelCase, always has id) ────────────
export interface NormalizedProp extends NFLProp {
  id: string;   // required after normalization
}

// ─── Bet slip leg ─────────────────────────────────────────────────────────────
export interface BetLeg {
  id:        string;
  propId?:   string;
  player:    string;
  prop:      string;
  line:      number;
  team?:     string;
  matchup?:  string;
  selection: 'Over' | 'Under';
  odds?:     number;
  gameDate?: string;
  week?:     number;
  season?:   number;
  status?:   'pending' | 'won' | 'lost' | 'push';
}

// ─── Bet slip item (leg + metadata) ──────────────────────────────────────────
export interface BetSlipItem {
  prop:      NormalizedProp;
  betAmount: number;
  overUnder: 'Over' | 'Under';
  odds?:     number;
}

// ─── Sort key (for table column sorting) ─────────────────────────────────────
export type SortKey = keyof NFLProp | 'default';