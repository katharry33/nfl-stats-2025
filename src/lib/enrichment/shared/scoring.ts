// lib/enrichment/shared/scoring.ts
export type PropResult = 'won' | 'lost' | 'push' | 'pending';

export interface ScoringInput {
  playerAvg: number;
  opponentRank: number;
  opponentAvgVsStat: number;
  line: number;
  seasonHitPct: number | null;
  odds: number | null;
  propNorm: string;
}

export interface ScoringOutput {
  bestEdge: number | null;
  bestEdgePct: number | null;
  conf: number | null;
  expectedValue: number | null;
  impliedOdds: number;
  modelResult: 'over' | 'under' | 'even';
  modelProb: number;
}

export function computeScoring(input: ScoringInput, sport: 'nfl' | 'nba' = 'nfl'): ScoringOutput {
  const { playerAvg, opponentAvgVsStat, line, seasonHitPct, odds } = input;

  const oppWeight = 0.2;
  const hitRateWeight = 0.2;

  const oppAdj = playerAvg ? (playerAvg - opponentAvgVsStat) / playerAvg : 0;
  const weightedAvg = playerAvg * (1 + oppAdj * oppWeight);

  let modelLine = weightedAvg;
  if (seasonHitPct != null) {
    modelLine = modelLine * (1 - hitRateWeight) + line * seasonHitPct * hitRateWeight;
  }

  const diff = modelLine - line;
  const modelResult = diff > 0 ? 'over' : 'under';

  let modelProb = 0.5 + diff / Math.max(Math.abs(line) * 2, 1);
  modelProb = Math.max(0.01, Math.min(0.99, modelProb));

  let impliedOdds: number;
  if (modelProb > 0.5) {
    const decimal = modelProb / (1 - modelProb);
    impliedOdds = -Math.round(decimal * 100);
  } else {
    const decimal = (1 - modelProb) / modelProb;
    impliedOdds = Math.round(decimal * 100);
  }

  const marketOdds = odds ?? -110;
  const marketDecimal = marketOdds > 0 ? 1 + marketOdds / 100 : 1 + 100 / Math.abs(marketOdds);
  const impliedDecimal = impliedOdds > 0 ? 1 + impliedOdds / 100 : 1 + 100 / Math.abs(impliedOdds);

  const bestEdgeDecimal = impliedDecimal - marketDecimal;
  const bestEdgePct = marketDecimal ? bestEdgeDecimal / marketDecimal : null;

  const payout = impliedDecimal;
  const evCurrency = modelProb * (payout - 1) - (1 - modelProb) * 1;
  const evPercent = evCurrency * 100;

  const confidenceScore = Math.abs(diff) / Math.max(Math.abs(line), 1) * 100;

  return {
    bestEdge: Number((bestEdgeDecimal * 100).toFixed(2)),
    bestEdgePct: bestEdgePct != null ? Number((bestEdgePct * 100).toFixed(2)) : null,
    conf: Number(confidenceScore.toFixed(2)),
    expectedValue: Number(evPercent.toFixed(2)),
    impliedOdds,
    modelResult,
    modelProb,
  };
}

export function determineResult(stat: number, line: number, overUnder: 'Over' | 'Under'): PropResult {
  if (stat === line) return 'push';
  if (overUnder === 'Over') return stat > line ? 'won' : 'lost';
  return stat < line ? 'won' : 'lost';
}

export function calculateProfitLoss(betAmount: number, odds: number, result: PropResult): number {
  if (result === 'won') {
    if (odds > 0) return betAmount * (odds / 100);
    return betAmount / (Math.abs(odds) / 100);
  }
  if (result === 'lost') return -betAmount;
  return 0;
}
