// src/lib/enrichment/scoring.ts
// Exact port of Google Sheets enrichment formulas

import type { NFLProp } from '@/lib/types';

type PropResult = 'won' | 'lost' | 'push' | 'pending';

// ─── Column formula translations ────────────────────────────────────────────
//  L  yardsScore       = playerAvg * 0.7 + opponentAvgVsStat * 0.3
//  M  rankScore        = ((opponentRank - 16.5) / 32) * 10
//  N  totalScore       = yardsScore + rankAdjustment
//  O  scoreDiff        = totalScore - line
//  P  scalingFactor    = scoreDiff / 10
//  Q  winProbability   = EXP(-scalingFactor)
//  R  prediction       = scoreDiff > 0 → "Over", < 0 → "Under"
//  S  projWinPct       = Over: 1/(1+winProb)   Under: winProb/(1+winProb)
//  T  seasonHitPct     (pre-filled by PFR enrichment — not computed here)
//  U  avgWinProb       = avg(projWinPct, seasonHitPct)  or projWinPct alone
//  V  bestOdds         (pre-filled from BettingPros / Odds API)
//  W  impliedProb      = odds>0 → 100/(odds+100)  else ABS(odds)/(ABS(odds)+100)
//  X  bestEdgePct      = avgWinProb - impliedProb
//  Y  expectedValue    = avgWinProb * payout - (1 - avgWinProb)
//  Z  kellyPct         = (b*p - q) / b, capped by prop type
//  AA valueIcon        = edge>10% → 🔥  edge>5% → ⚠️  else → ❄️
//  AB confidenceScore  = 0.4*projWinPct + 0.4*seasonHitPct + 0.2*avgWinProb
// ────────────────────────────────────────────────────────────────────────────

// Standard juice used when no odds are stored.
// Allows EV/Kelly/Edge to always compute — props without real odds
// get a conservative baseline rather than showing "—".
const DEFAULT_ODDS = -110;

export interface ScoringInput {
  playerAvg:         number;
  opponentRank:      number;
  opponentAvgVsStat: number;
  line:              number;
  seasonHitPct:      number | null;
  odds:              number | null; // American odds, e.g. -110, +150
  propNorm:          string;
}

export interface ScoringOutput {
  yardsScore:      number;
  rankScore:       number;
  totalScore:      number;
  scoreDiff:       number;
  scalingFactor:   number;
  winProbability:  number;
  overUnder:       'Over' | 'Under';
  projWinPct:      number;
  avgWinProb:      number | null;
  impliedProb:     number;
  bestEdgePct:     number;
  expectedValue:   number;
  kellyPct:        number | null;
  valueIcon:       string;
  confidenceScore: number;
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
  const {
    playerAvg, opponentRank, opponentAvgVsStat,
    line, seasonHitPct, propNorm,
  } = input;

  // Use stored odds or fall back to -110 (standard juice).
  // This ensures EV/Kelly/Edge always compute even when no line is stored.
  const odds = (input.odds != null && input.odds !== 0) ? input.odds : DEFAULT_ODDS;

  // L – N: blended model score
  const yardsScore     = playerAvg * 0.7 + opponentAvgVsStat * 0.3;
  const rankAdjustment = ((opponentRank - 16.5) / 32) * 10; // rank 1 = −5.2, rank 32 = +4.8
  const totalScore     = yardsScore + rankAdjustment;

  // O – Q
  const scoreDiff     = totalScore - line;
  const scalingFactor = scoreDiff / 10;
  const winProbability = Math.exp(-scalingFactor);

  // R – S
  const overUnder = scoreDiff >= 0 ? 'Over' : 'Under';
  const projWinPct = overUnder === 'Over'
    ? 1 / (1 + winProbability)
    : winProbability / (1 + winProbability);

  // U: blend model + historical when hit% available
  const avgWinProb = seasonHitPct != null
    ? (projWinPct + seasonHitPct) / 2
    : null;

  // The win probability used for all downstream calcs
  const winProb = avgWinProb ?? projWinPct;

  // W – Z: always compute (odds defaults to -110 if missing)
  const impliedProb = impliedProbFromOdds(odds);
  const bestEdgePct = winProb - impliedProb;

  const payout = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  const expectedValue = winProb * payout - (1 - winProb);

  let kellyPct: number | null = null;
  if (bestEdgePct > 0) {
    const rawKelly = (payout * winProb - (1 - winProb)) / payout;
    kellyPct = Math.min(rawKelly, kellyCap(propNorm));
  }

  // AA
  const valueIcon = bestEdgePct > 0.10 ? '🔥' : bestEdgePct > 0.05 ? '⚠️' : '❄️';

  // AB: confidence
  //   With seasonHitPct:    40% model + 40% historical + 20% blend
  //   Without seasonHitPct: pure model probability
  const confidenceScore = seasonHitPct != null
    ? 0.4 * projWinPct + 0.4 * seasonHitPct + 0.2 * (avgWinProb ?? projWinPct)
    : projWinPct;

  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  const r3 = (v: number) => Math.round(v * 1000)  / 1000;

  return {
    yardsScore:      r3(yardsScore),
    rankScore:       r3(rankAdjustment),
    totalScore:      r3(totalScore),
    scoreDiff:       r3(scoreDiff),
    scalingFactor:   r3(scalingFactor),
    winProbability:  r4(winProbability),
    overUnder,
    projWinPct:      r4(projWinPct),
    avgWinProb:      avgWinProb != null ? r4(avgWinProb) : null,
    impliedProb:     r4(impliedProb),
    bestEdgePct:     r4(bestEdgePct),
    expectedValue:   r4(expectedValue),
    kellyPct:        kellyPct != null ? r4(kellyPct) : null,
    valueIcon,
    confidenceScore: r4(confidenceScore),
  };
}

// ─── Best odds picker ─────────────────────────────────────────────────────────
export function pickBestOdds(
  fdOdds?: number | null,
  dkOdds?: number | null,
): { odds: number | null; book: string | null } {
  const candidates = [
    { odds: fdOdds ?? null, book: 'FanDuel'    },
    { odds: dkOdds ?? null, book: 'DraftKings' },
  ].filter(c => c.odds != null) as { odds: number; book: string }[];

  if (!candidates.length) return { odds: null, book: null };

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
  line:       number,
  overUnder:  string,
): PropResult {
  const ou = overUnder.toLowerCase();
  if (Math.abs(actualStat - line) < 0.001) return 'push';
  if (ou === 'over')  return actualStat > line ? 'won' : 'lost';
  if (ou === 'under') return actualStat < line ? 'won' : 'lost';
  return 'pending';
}

export function calculateProfitLoss(
  betAmount: number,
  odds:      number,
  result:    PropResult,
): number {
  if (result === 'push') return 0;
  if (result === 'lost') return -betAmount;
  const payout = odds > 0
    ? (odds / 100) * betAmount
    : (100 / Math.abs(odds)) * betAmount;
  return Math.round(payout * 100) / 100;
}