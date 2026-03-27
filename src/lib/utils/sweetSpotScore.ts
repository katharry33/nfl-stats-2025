// src/lib/utils/sweetSpotScore.ts

/**
 * Sweet Spot scoring logic for modern PropDoc.
 * Uses only fields that exist in the new ingestion + enrichment pipeline.
 */

import { PropDoc } from '@/lib/types';

export interface ScoringCriteria {
  tierThresholds: {
    bullseye: number;
    hot: number;
    warm: number;
  };
  weights: {
    confidence: number;     // prop.confidenceScore
    opponentRank: number;   // lower rank = better for Overs
    bestEdge: number;       // prop.bestEdge
    modelProb: number;      // prop.modelProb
    expectedValue: number;  // prop.expectedValue
    parlayLegs: number;     // optional penalty
  };
}

export type ScoreTier = 'bullseye' | 'hot' | 'warm' | 'cold';

export interface ScoreResult {
  totalScore: number;
  tier: ScoreTier;
  breakdown: Record<string, number>;
}

export function scoreProp(prop: PropDoc, criteria: ScoringCriteria): ScoreResult {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // 1. Confidence Score
  if (prop.confidenceScore != null) {
    const score = prop.confidenceScore * criteria.weights.confidence;
    breakdown.confidence = score;
    totalScore += score;
  }

  // 2. Opponent Rank (lower rank = stronger defense)
  if (prop.opponentRank != null) {
    const rankEffect =
      prop.overUnder === 'Over'
        ? (31 - prop.opponentRank) // bad defense → good for Overs
        : prop.opponentRank;       // strong defense → good for Unders

    const score = (rankEffect / 30) * 10 * criteria.weights.opponentRank;
    breakdown.opponentRank = score;
    totalScore += score;
  }

  // 3. Best Edge (your new enrichment field)
  if (prop.bestEdge != null) {
    const score = prop.bestEdge * criteria.weights.bestEdge;
    breakdown.bestEdge = score;
    totalScore += score;
  }

  // 4. Model Probability (0–1)
  if (prop.modelProb != null) {
    const score = prop.modelProb * criteria.weights.modelProb;
    breakdown.modelProb = score;
    totalScore += score;
  }

  // 5. Expected Value (EV)
  if (prop.expectedValue != null) {
    const score = prop.expectedValue * criteria.weights.expectedValue;
    breakdown.expectedValue = score;
    totalScore += score;
  }

  // 6. Parlay Legs Penalty (optional)
  const legCount = (prop as any).legCount;
  if (legCount && legCount > 1) {
    const score = (legCount - 1) * criteria.weights.parlayLegs;
    breakdown.parlayLegs = score;
    totalScore += score;
  }

  // Determine Tier
  let tier: ScoreTier = 'cold';
  if (totalScore >= criteria.tierThresholds.bullseye) tier = 'bullseye';
  else if (totalScore >= criteria.tierThresholds.hot) tier = 'hot';
  else if (totalScore >= criteria.tierThresholds.warm) tier = 'warm';

  return { totalScore, tier, breakdown };
}
