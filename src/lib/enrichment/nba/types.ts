// src/lib/enrichment/nba/types.ts

/**
 * Raw row from CSV or API ingestion.
 * Stored in Firestore under `rawRow`.
 */
export interface RawNBAPropRow {
    player: string;
    prop: string;
    line: string | number;
    odds?: string | number;
    team?: string;
    opponent?: string;
    matchup?: string;
    source?: string;
    overUnder?: string;
  }
  
  /**
   * Firestore document shape for an ingested NBA prop.
   * This is BEFORE enrichment.
   */
  export interface NBAPropDoc {
    id: string;
    uploadId: string;
    rowHash: string;
  
    rawRow: RawNBAPropRow;
    ingestMeta: {
      ingestedAt: string;
      source: string;
    };
  
    // Core fields
    player: string;
    team: string | null;
    opponent: string | null;
    gameDate: string;
    season: number;
    league: 'nba';
  
    // Prop fields
    prop: string;
    propNorm: string;
    line: number;
    overUnder: string;
  
    // Odds
    odds: number;
    impliedProb: number;
  
    // Enrichment status
    enriched: boolean;
    status: 'pending' | 'enriched' | 'error';
    lastEnriched?: string;
  
    // Optional BR ID (fallback generated if missing)
    brid?: string;
  
    // Enriched fields (added later)
    playerAvg?: number;
    seasonHitPct?: number;
    opponentRank?: number | null;
    opponentAvgVsStat?: number | null;
  
    // Scoring engine output
    modelProb?: number;
    expectedValue?: number;
    confidenceScore?: number;
    bestEdge?: number;
  }
  
  /**
   * Basketball Reference game log entry.
   * Parsed from HTML in bball.ts.
   */
  export interface NBAGameLog {
    date: string;
    opponent: string;
    result: string;
  
    pts: number;
    ast: number;
    trb: number;
    stl: number;
    blk: number;
    tov: number;
    fg3m: number;
  
    min?: number;
  }
  
  /**
   * TeamRankings defense stats for a single stat category.
   */
  export interface NBADefenseStat {
    team: string;
    stat: string;
    rank: number;
    avg: number;
  }
  
  /**
   * Output of computeScoring()
   */
  export interface ScoringOutput {
    modelProb: number;
    expectedValue: number;
    confidenceScore: number;
    bestEdge: number;
  }
  