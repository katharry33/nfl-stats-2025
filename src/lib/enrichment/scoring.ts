// src/lib/enrichment/scoring.ts
import type { PropResult } from '@/lib/types';

export interface ScoringInput {
  playerAvg:           number;
  opponentRank:        number;
  opponentAvgVsStat:   number;
  line:                number;
  seasonHitPct:        number | null;
  odds:                number | null;    
  propNorm:            string;
}

export interface ScoringOutput {
  yardsScore:        number;
  rankScore:         number;
  totalScore:        number;
  scoreDiff:         number;
  scalingFactor:     number;
  winProbability:    number;
  overUnder:         'Over' | 'Under';
  projWinPct:        number;
  avgWinProb:        number | null;
  impliedProb:       number | null;
  bestEdgePct:       number | null;
  expectedValue:     number | null;
  kellyPct:          number | null;
  valueIcon:         string;
  confidenceScore:   number;
}

function impliedProbFromOdds(odds: number): number {
  if (odds === 0) return 0.5;
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function kellyCap(propNorm: string): number {
  const p = propNorm.toLowerCase();
  if (p.includes('anytime td') || p.includes('atd')) return 0.02;
  if (p.includes('pass tds') || p.includes('passing td')) return 0.05;
  return 0.10;
}

export function computeScoring(input: ScoringInput): ScoringOutput {
  const { playerAvg, opponentRank, opponentAvgVsStat, line, seasonHitPct, odds, propNorm } = input;

  // L – N: Projections
  const yardsScore  = playerAvg + (opponentAvgVsStat / 100);
  const rankScore   = (opponentRank / 32) * 10;
  const totalScore  = yardsScore - rankScore;

  // O – Q: Spread to Probability (Sigmoid/Logistic)
  const scoreDiff      = totalScore - line;
  const scalingFactor  = scoreDiff / 10;
  const winProbability = Math.exp(-scalingFactor);

  // R – S: Market Direction
  const overUnder = scoreDiff >= 0 ? 'Over' : 'Under';
  const projWinPct = overUnder === 'Over'
    ? 1 / (1 + winProbability)
    : winProbability / (1 + winProbability);

  // U: Historical/Model Blending
  const avgWinProb = seasonHitPct != null
    ? (projWinPct + seasonHitPct) / 2
    : null;

  const winProb = avgWinProb ?? projWinPct;

  // W – Z: Betting Math
  let impliedProb:   number | null = null;
  let bestEdgePct:   number | null = null;
  let expectedValue: number | null = null;
  let kellyPct:      number | null = null;

  if (odds != null && odds !== 0) {
    impliedProb = impliedProbFromOdds(odds);
    bestEdgePct = winProb - impliedProb;

    const payout = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    expectedValue = Math.min(winProb * payout - (1 - winProb), 2);

    if (bestEdgePct > 0.01) {
      const b = payout;
      const p = winProb;
      const q = 1 - winProb;
      const rawKelly = (b * p - q) / b;
      kellyPct = Math.max(0, Math.min(rawKelly, kellyCap(propNorm)));
    }
  }

  // AA: UI Indicators
  const edge = bestEdgePct ?? 0;
  const valueIcon = edge > 0.10 ? '🔥' : edge > 0.05 ? '⚠️' : '❄️';

  // AB: Weighted Confidence Score
  const s = projWinPct;
  const t = seasonHitPct ?? projWinPct;
  const u = avgWinProb ?? projWinPct;
  const confidenceScore = 0.5 * s + 0.3 * t + 0.2 * u;

  // Rounding Helpers
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const r4 = (n: number) => Math.round(n * 10000) / 10000;

  return {
    yardsScore:      r3(yardsScore),
    rankScore:       r3(rankScore),
    totalScore:      r3(totalScore),
    scoreDiff:       r3(scoreDiff),
    scalingFactor:   r3(scalingFactor),
    winProbability:  r4(winProbability),
    overUnder,
    projWinPct:      r4(projWinPct),
    avgWinProb:      avgWinProb != null ? r4(avgWinProb) : null,
    impliedProb:     impliedProb != null ? r4(impliedProb) : null,
    bestEdgePct:     bestEdgePct != null ? r4(bestEdgePct) : null,
    expectedValue:   expectedValue != null ? r4(expectedValue) : null,
    kellyPct:        kellyPct != null ? r4(kellyPct) : null,
    valueIcon,
    confidenceScore: r4(confidenceScore),
  };
}

export function pickBestOdds(
  fdOdds?: number | null,
  dkOdds?: number | null
): { odds: number | null; book: string | null } {
  const candidates = [
    { odds: fdOdds ?? null, book: 'fanduel' },
    { odds: dkOdds ?? null, book: 'draftkings' },
  ].filter(c => c.odds != null) as { odds: number; book: string }[];

  if (!candidates.length) return { odds: null, book: null };

  candidates.sort((a, b) => {
    const pa = a.odds > 0 ? a.odds / 100 : 100 / Math.abs(a.odds);
    const pb = b.odds > 0 ? b.odds / 100 : 100 / Math.abs(b.odds);
    return pb - pa;
  });

  return { odds: candidates[0].odds, book: candidates[0].book };
}

export function determineResult(
  actualStat: number,
  line: number,
  overUnder: string
): PropResult {
  const ou = overUnder.toLowerCase();
  if (Math.abs(actualStat - line) < 0.001) return 'push';
  if (ou === 'over')  return actualStat > line ? 'won' : 'lost';
  if (ou === 'under') return actualStat < line ? 'won' : 'lost';
  return 'pending';
}

export function calculateProfitLoss(
  betAmount: number,
  odds: number,
  result: PropResult
): number {
  if (result === 'push') return 0;
  if (result === 'lost') return -betAmount;
  const payout = odds > 0 ? (odds / 100) * betAmount : (100 / Math.abs(odds)) * betAmount;
  return Math.round(payout * 100) / 100;
}