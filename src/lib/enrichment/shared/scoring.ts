// src/lib/enrichment/shared/scoring.ts

export interface ScoringInput {
  playerAvg: number | null;
  opponentRank: number | null;
  opponentAvgVsStat: number | null;
  line: number;
  seasonHitPct: number | null;
  odds: number | null;
  propNorm: string;
}

export interface ScoringOutput {
  modelProb: number;
  expectedValue: number;
  confidenceScore: number;
  bestEdge: number;
}

export function computeScoring(input: ScoringInput): ScoringOutput {
  const {
    playerAvg,
    opponentRank,
    opponentAvgVsStat,
    line,
    seasonHitPct,
    odds,
  } = input;

  const avg = playerAvg ?? 0;
  const oppAvg = opponentAvgVsStat ?? avg;
  const hitRate = seasonHitPct ?? 0.5;
  const marketOdds = odds ?? -110;

  const oppAdj = avg ? (avg - oppAvg) / avg : 0;
  const weightedAvg = avg * (1 + oppAdj * 0.2);

  const modelLine =
    weightedAvg * 0.8 +
    (line * hitRate) * 0.2;

  const diff = modelLine - line;

  let modelProb = 0.5 + diff / Math.max(Math.abs(line) * 2, 1);
  modelProb = Math.max(0.01, Math.min(0.99, modelProb));

  const payout =
    marketOdds > 0
      ? marketOdds / 100
      : 100 / Math.abs(marketOdds);

  const expectedValue =
    modelProb * payout - (1 - modelProb);

  const fairDecimal = 1 / modelProb;
  const marketDecimal =
    marketOdds > 0
      ? 1 + marketOdds / 100
      : 1 + 100 / Math.abs(marketOdds);

  const bestEdge = fairDecimal - marketDecimal;

  const confidenceScore =
    Math.abs(diff) / Math.max(Math.abs(line), 1);

  return {
    modelProb: Number(modelProb.toFixed(4)),
    expectedValue: Number(expectedValue.toFixed(4)),
    confidenceScore: Number(confidenceScore.toFixed(4)),
    bestEdge: Number(bestEdge.toFixed(4)),
  };
}
