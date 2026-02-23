
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
    pfrid: string; // Player ID from Pro-Football-Reference
  
    // Odds - Widened to allow string for resilient importing
    fdOdds?: number | string | null;
    dkOdds?: number | string | null;
    bestOdds?: number | string | null;
    bestBook?: string | null;
  
    // Projections & Grades
    pinnacleClosingLine?: number | null; // e.g. -115
    pinnacleClosingOdds?: number | null;
    projection?: number | null;
    grade?: number | null; // 1-100 scale
    confidence?: number | null; // 1-100 scale
    confidenceScore?: number | null;
    expectedValue?: number | null;
    bestEdge?: string | null;
    bestEdgePct?: number | null;
    overUnder?: 'Over' | 'Under' | null;
  
    // Post-game
    gameStat?: number | null;
    actualResult?: 'Win' | 'Loss' | 'Push' | null;
    betAmount?: number | null;
    profitLoss?: number | null;
    gradedBy?: string | null;
    gradedAt?: string | null;

    // Metadata
    createdAt?: any; // Allow Timestamp
    updatedAt?: any; // Allow Timestamp
}

// From Pro-Football-Reference
export interface PFRGame {
    week: number;
    date: string;
    opponent: string;
    result: string;
    passCmp: number;
    passAtt: number;
    passYds: number;
    passTD: number;
    interceptions: number;
    rushAtt: number;
    rushYds: number;
    rushTD: number;
    receptions: number;
    recYds: number;
    recTD: number;
    [key: string]: string | number; // For dynamic access
}
