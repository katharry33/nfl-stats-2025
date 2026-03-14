// src/lib/enrichment/scoring.ts
// Exact port of Google Sheets enrichment formulas

import type { NFLProp } from '@/lib/types';

type PropResult = 'won' | 'lost' | 'push' | 'pending';

// ─── Column formula translations ────────────────────────────────────────────
//  L  yardsScore       = playerAvg + (opponentAvgVsStat / 100)
//  M  rankScore        = (opponentRank / 32) * 10
//  N  totalScore       = yardsScore - rankScore
//  O  scoreDiff        = totalScore - line
//  P  scalingFactor    = scoreDiff / 10
//  Q  winProbability   = EXP(-scalingFactor)
//  R  prediction       = scoreDiff > 0 → "Over", < 0 → "Under"
//  S  projWinPct       = Over: 1/(1+winProb)   Under: winProb/(1+winProb)
//  T  seasonHitPct     (pre-filled by fillPropHitPercent — not computed here)
//  U  avgWinProb       = avg(projWinPct, seasonHitPct)
//  V  bestOdds         (pre-filled from BettingPros / Odds API)
//  W  impliedProb      = odds>0 → 100/(odds+100)  else ABS(odds)/(ABS(odds)+100)
//  X  bestEdgePct      = avgWinProb - impliedProb
//  Y  expectedValue    = min( avgWinProb * payout - (1 - avgWinProb), 2 )
//  Z  kellyPct         = (b*p - q) / b, capped by prop type
//  AA valueIcon        = edge>10% → 🔥  edge>5% → ⚠️  else → ❄️
//  AB confidenceScore  = 0.5*projWinPct + 0.3*seasonHitPct + 0.2*avgWinProb
// ────────────────────────────────────────────────────────────────────────────

export interface ScoringInput {
  playerAvg:           number;
  opponentRank:        number;
  opponentAvgVsStat:   number;
  line:                number;
  seasonHitPct:        number | null;
  odds:                number | null;    // American odds, e.g. -110, +150
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
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function kellyCap(propNorm: string): number {
  const p = propNorm.toLowerCase();
  if (p.includes('anytime td')) return 0.02;
  if (p.includes('pass tds') || p.includes('passing td')) return 0.05;
  return 0.10;
}

export function computeScoring(input: ScoringInput): ScoringOutput {
  const { playerAvg, opponentRank, opponentAvgVsStat, line, seasonHitPct, odds, propNorm } = input;

  // L – N
  const yardsScore  = playerAvg + (opponentAvgVsStat / 100);
  const rankScore   = (opponentRank / 32) * 10;
  const totalScore  = yardsScore - rankScore;

  // O – Q
  const scoreDiff      = totalScore - line;
  const scalingFactor  = scoreDiff / 10;
  const winProbability = Math.exp(-scalingFactor);

  // R – S
  const overUnder = scoreDiff >= 0 ? 'Over' : 'Under';
  const projWinPct = overUnder === 'Over'
    ? 1 / (1 + winProbability)
    : winProbability / (1 + winProbability);

  // U
  const avgWinProb = seasonHitPct != null
    ? (projWinPct + seasonHitPct) / 2
    : null;

  const winProb = avgWinProb ?? projWinPct;

  // W – Z
  let impliedProb:   number | null = null;
  let bestEdgePct:   number | null = null;
  let expectedValue: number | null = null;
  let kellyPct:      number | null = null;

  if (odds != null) {
    impliedProb = impliedProbFromOdds(odds);
    bestEdgePct = winProb - impliedProb;

    // EV: min(winProb * payout - (1 - winProb), 2)
    const payout = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    expectedValue = Math.min(winProb * payout - (1 - winProb), 2);

    if (bestEdgePct > 0) {
      const b = payout;
      const p = winProb;
      const q = 1 - winProb;
      const rawKelly = (b * p - q) / b;
      kellyPct = Math.min(rawKelly, kellyCap(propNorm));
    }
  }

  // AA
  const edge = bestEdgePct ?? 0;
  const valueIcon = edge > 0.10 ? '🔥' : edge > 0.05 ? '⚠️' : '❄️';

  // AB — use available hit % data; fall back gracefully
  const s = projWinPct;
  const t = seasonHitPct ?? projWinPct;
  const u = avgWinProb ?? projWinPct;
  const confidenceScore = 0.5 * s + 0.3 * t + 0.2 * u;

  return {
    yardsScore:      Math.round(yardsScore * 1000) / 1000,
    rankScore:       Math.round(rankScore * 1000) / 1000,
    totalScore:      Math.round(totalScore * 1000) / 1000,
    scoreDiff:       Math.round(scoreDiff * 1000) / 1000,
    scalingFactor:   Math.round(scalingFactor * 1000) / 1000,
    winProbability:  Math.round(winProbability * 10000) / 10000,
    overUnder,
    projWinPct:      Math.round(projWinPct * 10000) / 10000,
    avgWinProb:      avgWinProb != null ? Math.round(avgWinProb * 10000) / 10000 : null,
    impliedProb:     impliedProb != null ? Math.round(impliedProb * 10000) / 10000 : null,
    bestEdgePct:     bestEdgePct != null ? Math.round(bestEdgePct * 10000) / 10000 : null,
    expectedValue:   expectedValue != null ? Math.round(expectedValue * 10000) / 10000 : null,
    kellyPct:        kellyPct != null ? Math.round(kellyPct * 10000) / 10000 : null,
    valueIcon,
    confidenceScore: Math.round(confidenceScore * 10000) / 10000,
  };
}

// ─── Best odds picker ────────────────────────────────────────────────────────
export function pickBestOdds(
  fdOdds?: number | null,
  dkOdds?: number | null
): { odds: number | null; book: string | null } {
  const candidates = [
    { odds: fdOdds ?? null, book: 'FanDuel' },
    { odds: dkOdds ?? null, book: 'DraftKings' },
  ].filter(c => c.odds != null) as { odds: number; book: string }[];

  if (!candidates.length) return { odds: -110, book: 'default' }; // standard juice default

  // Prefer the best payout (highest positive or least negative)
  candidates.sort((a, b) => {
    const pa = a.odds > 0 ? a.odds / 100 : 100 / Math.abs(a.odds);
    const pb = b.odds > 0 ? b.odds / 100 : 100 / Math.abs(b.odds);
    return pb - pa;
  });

  return { odds: candidates[0].odds, book: candidates[0].book };
}

// ─── Post-game result scoring ─────────────────────────────────────────────────
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