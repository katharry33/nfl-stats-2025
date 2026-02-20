// src/lib/enrichment/types.ts

export interface NFLProp {
    id?: string;
    week: number;
    season: number;
    gameDate: string;
    gameTime: string;
    matchup: string;
    player: string;
    team: string;
    prop: string;
    line: number;
  
    // Odds
    fdOdds?: number | null;
    dkOdds?: number | null;
    bestOdds?: number | null;
    bestBook?: string | null;
  
    // Enriched — Player stats
    playerAvg?: number | null;
    opponentRank?: number | null;
    opponentAvgVsStat?: number | null;
    seasonHitPct?: number | null;
    overUnder?: string | null;
  
    // Enriched — Scoring model
    yardsScore?: number | null;
    rankScore?: number | null;
    totalScore?: number | null;
    scoreDiff?: number | null;
    adjustedScore?: number | null;
    expFunction?: number | null;
    projWinPct?: number | null;
    avgWinProb?: number | null;
  
    // Enriched — Value metrics
    bestImpliedProb?: number | null;
    bestEdgePct?: number | null;
    bestEV?: number | null;
    bestKellyPct?: number | null;
    valueIcon?: string | null;
    confidenceScore?: number | null;
  
    // Post-game
    gameStat?: number | null;
    actualResult?: 'Win' | 'Loss' | 'Push' | null;
    betAmount?: number | null;
    profitLoss?: number | null;
    betStatus?: string | null;
    parlayId?: string | null;
    notes?: string | null;
  
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface PFRGame {
    week: number;
    date: string;
    passAtt: number;
    passYds: number;
    passTds: number;
    passCmp: number;
    rushAtt: number;
    rushYds: number;
    rushTds: number;
    receptions: number;
    recYds: number;
    recTds: number;
  }
  
  export interface DefenseStats {
    rank: number;
    avg: number;
  }
  
  export interface DefenseMap {
    [key: string]: DefenseStats; // "propNorm||TEAM_ABBR"
  }