// src/lib/enrichment/scoring.ts

/**
 * Standard juice used when no odds are stored.
 * Allows EV/Kelly/Edge to always compute.
 */
const DEFAULT_ODDS = -110;

export type PropResult = 'won' | 'lost' | 'push' | 'pending';

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
  avgWinProb:      number; // Guaranteed number for downstream math
  impliedProb:     number;
  bestEdgePct:     number;
  expectedValue:   number;
  kellyPct:        number | null;
  confidenceScore: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function impliedProbFromOdds(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function kellyCap(propNorm: string, sport: string): number {
  const p = propNorm.toLowerCase();
  // NBA is higher frequency/volatility; we use a flatter 5% cap
  if (sport === 'nba') return 0.05; 
  
  // NFL specific caps based on prop variance
  if (p.includes('anytime td')) return 0.02;
  if (p.includes('pass tds') || p.includes('passing td')) return 0.05;
  return 0.10;
}

// ─── Main Scoring Logic ──────────────────────────────────────────────────────

/**
 * computeScoring
 * Port of the Gridiron Guru Google Sheets enrichment formulas.
 * Supports both NFL (32 teams) and NBA (30 teams) via midpoint normalization.
 */
export function computeScoring(input: ScoringInput, sport: 'nfl' | 'nba' = 'nfl'): ScoringOutput {
  const {
    playerAvg, opponentRank, opponentAvgVsStat,
    line, seasonHitPct, propNorm,
  } = input;

  // Use stored odds or fallback to -110
  const odds = (input.odds != null && input.odds !== 0) ? input.odds : DEFAULT_ODDS;

  // 1. Midpoint logic: NFL (32 teams) = 16.5 | NBA (30 teams) = 15.5
  const leagueSize = sport === 'nfl' ? 32 : 30;
  const midPoint = (leagueSize + 1) / 2;

  // 2. Blended model score (70/30 Weighting)
  const yardsScore = playerAvg * 0.7 + opponentAvgVsStat * 0.3;
  const rankAdjustment = ((opponentRank - midPoint) / leagueSize) * 10; 
  const totalScore = yardsScore + rankAdjustment;

  // 3. Probability Calculations
  const scoreDiff = totalScore - line;
  const scalingFactor = scoreDiff / 10;
  
  // Guard against extreme scaling causing Infinity in Math.exp
  const safeScaling = Math.max(Math.min(scalingFactor, 10), -10);
  const winProbability = Math.exp(-safeScaling);

  const overUnder = scoreDiff >= 0 ? 'Over' : 'Under';
  const projWinPct = overUnder === 'Over'
    ? 1 / (1 + winProbability)
    : winProbability / (1 + winProbability);

  // 4. Blend Model + Historical (Season Hit %)
  // If no hit rate exists, we rely 100% on the model projection
  const avgWinProb = seasonHitPct != null
    ? (projWinPct + seasonHitPct) / 2
    : projWinPct;

  // 5. Betting Metrics (Edge, EV, Kelly)
  const impliedProb = impliedProbFromOdds(odds);
  const bestEdgePct = avgWinProb - impliedProb;

  const payout = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  const expectedValue = avgWinProb * payout - (1 - avgWinProb);

  let kellyPct: number | null = null;
  if (bestEdgePct > 0) {
    const rawKelly = (payout * avgWinProb - (1 - avgWinProb)) / payout;
    kellyPct = Math.min(rawKelly, kellyCap(propNorm, sport));
  }

  // 6. Confidence Score
  const confidenceScore = seasonHitPct != null
    ? 0.4 * projWinPct + 0.4 * seasonHitPct + 0.2 * avgWinProb
    : projWinPct;

  // 7. Precision Rounding (r4 = 0.0000, r3 = 0.000)
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
    avgWinProb:      r4(avgWinProb),
    impliedProb:     r4(impliedProb),
    bestEdgePct:     r4(bestEdgePct),
    expectedValue:   r4(expectedValue),
    kellyPct:        kellyPct != null ? r4(kellyPct) : null,
    confidenceScore: r4(confidenceScore),
  };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * pickBestOdds
 * Compares books and returns the best available American odds.
 */
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

/**
 * determineResult
 * Standardizes whether a prop hit based on the actual stats.
 */
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

/**
 * calculateProfitLoss
 * Computes return based on wager and American odds.
 */
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