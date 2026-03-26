// src/lib/enrichment/shared/scoring.ts

// 1. REMOVE all imports from '@/lib/enrichment/scoring'
// 2. Ensure interfaces and functions are EXPORTED

export type PropResult = 'won' | 'lost' | 'push' | 'pending';

export interface ScoringInput {
  playerAvg:         number;
  opponentRank:      number;
  opponentAvgVsStat: number;
  line:              number;
  seasonHitPct:      number | null;
  odds:              number | null;
  propNorm:          string;
}

export interface ScoringOutput {
    bestEdge: number | null;
    bestEdgePct: number | null;
    conf: number | null;
    expectedValue: number | null;
    impliedOdds: number;
    modelResult: "over" | "under" | "even";
    modelProb: number;
}

// Ensure the keyword 'export' is in front of the function
export function computeScoring(input: ScoringInput, sport: 'nfl' | 'nba' = 'nfl'): ScoringOutput {
    const { playerAvg, opponentRank, opponentAvgVsStat, line, seasonHitPct, odds, propNorm } = input;

    // VERY simple model for now - this will evolve
    const avgWeight = 0.6;
    const oppWeight = 0.2;
    const hitRateWeight = 0.2;

    const oppAdj = (playerAvg - opponentAvgVsStat) / playerAvg;
    const weightedAvg = playerAvg * (1 + oppAdj * oppWeight);

    let modelLine = weightedAvg;
    if (seasonHitPct) {
        modelLine = (modelLine * (1 - hitRateWeight)) + (line * seasonHitPct * hitRateWeight);
    }

    const diff = modelLine - line;
    const modelResult = diff > 0 ? 'over' : 'under';
    const modelProb = 0.5 + (diff / (line * 2)); // Simplified probability

    const impliedOdds = modelProb > 0.5 ? (100 / (modelProb * 100)) * -100 : (100 / modelProb) - 100;
    const bestEdge = odds ? odds - impliedOdds : null;
    const bestEdgePct = bestEdge ? bestEdge / Math.abs(impliedOdds) : null;
    const confidenceScore = Math.abs(diff / line) * 100;
    const expectedValue = bestEdge ? (bestEdge / 100) * 100 : null;


    return {
        bestEdge,
        bestEdgePct,
        conf: confidenceScore,
        expectedValue,
        impliedOdds,
        modelResult,
        modelProb,
    };
}

export function determineResult(stat: number, line: number, overUnder: 'Over' | 'Under'): PropResult {
  if (stat > line) return overUnder === 'Over' ? 'won' : 'lost';
  if (stat < line) return overUnder === 'Under' ? 'won' : 'lost';
  return 'push';
}

export function calculateProfitLoss(betAmount: number, odds: number, result: PropResult): number {
    if (result === 'won') {
        if (odds > 0) return betAmount * (odds / 100);
        return betAmount / (Math.abs(odds) / 100);
    }
    if (result === 'lost') return -betAmount;
    return 0; // Push
}
