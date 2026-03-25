// src/lib/utils/sweetSpotScore.ts

/**
 * This file defines the logic for scoring a proposition bet based on a 
 * configurable set of criteria. It's the "secret sauce" for the Sweet Spot feature.
 */

// The criteria weights. User can override these.
export interface ScoringCriteria {
  tierThresholds: {
    bullseye: number;
    hot: number;
    warm: number;
  };
  weights: {
    scoreDiff: number;      // e.g., 2.5
    confidence: number;     // e.g., 1.5
    opponentRank: number;   // e.g., 1.0
    bestEdge: number;       // e.g., 2.0
    kelly: number;          // e.g., 1.0
    parlayLegs: number;     // e.g., -0.5 (penalty for more legs)
  };
}

// The data for a single prop needed for scoring
export interface PropData {
  prop: string;
  overUnder: 'Over' | 'Under';
  scoreDiff: number | null | undefined;
  confidenceScore: number | null | undefined;
  opponentRank: number | null | undefined;
  bestEdgePct: number | null | undefined;
  kellyPct: number | null | undefined;
  legCount?: number;
}

export type ScoreTier = 'bullseye' | 'hot' | 'warm' | 'cold';

export interface ScoreResult {
  totalScore: number;
  tier: ScoreTier;
  breakdown: Record<string, number>;
}

/**
 * Scores a single prop based on provided data and criteria.
 * @param prop - The prop data to score.
 * @param criteria - The weights and thresholds to use.
 * @returns A score result with total, tier, and breakdown.
 */
export function scoreProp(prop: PropData, criteria: ScoringCriteria): ScoreResult {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // 1. Score Difference
  if (prop.scoreDiff) {
    const score = prop.scoreDiff * criteria.weights.scoreDiff;
    breakdown.scoreDiff = score;
    totalScore += score;
  }

  // 2. Confidence Score
  if (prop.confidenceScore) {
    const score = prop.confidenceScore * criteria.weights.confidence;
    breakdown.confidence = score;
    totalScore += score;
  }

  // 3. Opponent Rank (Lower rank is better for O, worse for U)
  if (prop.opponentRank) {
    const rankEffect = prop.overUnder === 'Over' ? (31 - prop.opponentRank) : prop.opponentRank;
    const score = (rankEffect / 30) * 10 * criteria.weights.opponentRank;
    breakdown.opponentRank = score;
    totalScore += score;
  }

  // 4. Best Edge Percentage
  if (prop.bestEdgePct) {
    const score = prop.bestEdgePct * criteria.weights.bestEdge;
    breakdown.bestEdge = score;
    totalScore += score;
  }

  // 5. Kelly Criterion Percentage
  if (prop.kellyPct) {
    const score = prop.kellyPct * 100 * criteria.weights.kelly; // Scale it up
    breakdown.kelly = score;
    totalScore += score;
  }

  // 6. Parlay Legs Penalty
  if (prop.legCount && prop.legCount > 1) {
    const score = (prop.legCount - 1) * criteria.weights.parlayLegs;
    breakdown.parlayLegs = score;
    totalScore += score;
  }
  
  // Determine Tier
  let tier: ScoreTier = 'cold';
  if (totalScore >= criteria.tierThresholds.bullseye) {
    tier = 'bullseye';
  } else if (totalScore >= criteria.tierThresholds.hot) {
    tier = 'hot';
  } else if (totalScore >= criteria.tierThresholds.warm) {
    tier = 'warm';
  }

  return { totalScore, tier, breakdown };
}
