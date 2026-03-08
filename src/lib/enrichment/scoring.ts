// src/lib/enrichment/scoring.ts
// Port of the spreadsheet formula columns L–AB

import { calculateNetProfit } from '../utils';
import type { PropResult } from '../types';

export interface ScoringInput {
  playerAvg: number;
  opponentRank: number;
  opponentAvgVsStat: number;
  line: number;
  seasonHitPct: number | null;
  odds: number | null;
  propNorm?: string;
}

export interface ScoringOutput {
  yardsScore: number;
  rankScore: number;
  totalScore: number;
  scoreDiff: number;
  adjustedScore: number;
  expFunction: number;
  overUnder: 'Over' | 'Under' | '';
  projWinPct: number;
  avgWinProb: number;
  bestImpliedProb: number | null;
  bestEdgePct: number | null;
  bestEV: number | null;
  bestKellyPct: number | null;
  valueIcon: '🔥' | '⚠️' | '❄️' | '';
  confidenceScore: number | null;
}

export function computeScoring(input: ScoringInput): ScoringOutput {
  const { playerAvg, opponentRank, opponentAvgVsStat, line, seasonHitPct, odds, propNorm } = input;

  const yardsScore    = playerAvg + opponentAvgVsStat / 100;
  const rankScore     = (opponentRank / 32) * 10;
  const totalScore    = yardsScore - rankScore;
  const scoreDiff     = totalScore - line;
  const adjustedScore = scoreDiff / 10;
  const expFunction   = Math.exp(-adjustedScore);

  const overUnder: 'Over' | 'Under' | '' =
    scoreDiff > 0 ? 'Over' : scoreDiff < 0 ? 'Under' : '';

  const projWinPct =
    overUnder === 'Over'  ? 1 / (1 + expFunction) :
    overUnder === 'Under' ? expFunction / (1 + expFunction) : 0;

  const avgWinProb = seasonHitPct != null
    ? (projWinPct + seasonHitPct) / 2
    : projWinPct;

  let bestImpliedProb: number | null = null;
  let bestEdgePct: number | null = null;
  let bestEV: number | null = null;
  let bestKellyPct: number | null = null;

  if (odds != null) {
    bestImpliedProb = impliedProb(odds);
    bestEdgePct = avgWinProb - bestImpliedProb;
    const b = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    bestEV = Math.min(avgWinProb * b - (1 - avgWinProb), 2);
    if (bestEdgePct > 0) {
      const kelly = (b * avgWinProb - (1 - avgWinProb)) / b;
      bestKellyPct = Math.min(kelly, getKellyCap(propNorm ?? ''));
    }
  }

  const valueIcon: '🔥' | '⚠️' | '❄️' | '' =
    bestEdgePct == null ? '' :
    bestEdgePct > 0.1 ? '🔥' :
    bestEdgePct > 0.05 ? '⚠️' : '❄️';

  const confidenceScore = seasonHitPct != null
    ? 0.5 * projWinPct + 0.3 * seasonHitPct + 0.2 * avgWinProb
    : null;

  return {
    yardsScore, rankScore, totalScore, scoreDiff, adjustedScore,
    expFunction, overUnder, projWinPct, avgWinProb,
    bestImpliedProb, bestEdgePct, bestEV, bestKellyPct,
    valueIcon, confidenceScore,
  };
}

export function pickBestOdds(
  fdOdds?: number | null,
  dkOdds?: number | null
): { odds: number | null; book: string | null } {
  const fd = typeof fdOdds === 'number' ? fdOdds : null;
  const dk = typeof dkOdds === 'number' ? dkOdds : null;
  if (fd === null && dk === null) return { odds: null, book: null };
  if (fd === null) return { odds: dk, book: 'DK' };
  if (dk === null) return { odds: fd, book: 'FD' };
  const fdVal = fd > 0 ? fd : -10000 / fd;
  const dkVal = dk > 0 ? dk : -10000 / dk;
  return fdVal >= dkVal ? { odds: fd, book: 'FD' } : { odds: dk, book: 'DK' };
}

export function impliedProb(americanOdds: number): number {
  return americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

/**
 * Returns lowercase result to match NFLProp.actualResult (PropResult type).
 */
export function determineResult(
  gameStat: number,
  line: number,
  overUnder: string
): PropResult {
  const ou = overUnder.toLowerCase();
  if (ou.includes('over'))  return gameStat > line ? 'won' : gameStat < line ? 'lost' : 'push';
  if (ou.includes('under')) return gameStat < line ? 'won' : gameStat > line ? 'lost' : 'push';
  return 'push';
}

export function calculateProfitLoss(
  result: PropResult,
  betAmount: number,
  odds: number | string
): number {
  if (result === 'won')  return calculateNetProfit(betAmount, Number(odds));
  if (result === 'lost') return -betAmount;
  return 0; // push or pending
}

function getKellyCap(propNorm: string): number {
  if (propNorm.includes('anytime td')) return 0.02;
  if (propNorm.includes('pass tds'))   return 0.05;
  return 0.10;
}