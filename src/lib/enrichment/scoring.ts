// src/lib/enrichment/scoring.ts
// Port of the spreadsheet formula columns L–AB

import { calculateNetProfit } from '../utils';

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
  
    const yardsScore    = playerAvg + opponentAvgVsStat / 100;               // Col L
    const rankScore     = (opponentRank / 32) * 10;                           // Col M
    const totalScore    = yardsScore - rankScore;                              // Col N
    const scoreDiff     = totalScore - line;                                   // Col O
    const adjustedScore = scoreDiff / 10;                                      // Col P
    const expFunction   = Math.exp(-adjustedScore);                            // Col Q
  
    const overUnder: 'Over' | 'Under' | '' =
      scoreDiff > 0 ? 'Over' : scoreDiff < 0 ? 'Under' : '';                 // Col R
  
    const projWinPct =                                                         // Col S
      overUnder === 'Over'  ? 1 / (1 + expFunction) :
      overUnder === 'Under' ? expFunction / (1 + expFunction) : 0;
  
    const avgWinProb = seasonHitPct != null                                    // Col U
      ? (projWinPct + seasonHitPct) / 2
      : projWinPct;
  
    let bestImpliedProb: number | null = null;
    let bestEdgePct: number | null = null;
    let bestEV: number | null = null;
    let bestKellyPct: number | null = null;
  
    if (odds != null) {
      bestImpliedProb = impliedProb(odds);                                     // Col W
      bestEdgePct = avgWinProb - bestImpliedProb;                              // Col X
      const b = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      bestEV = Math.min(avgWinProb * b - (1 - avgWinProb), 2);                // Col Y
      if (bestEdgePct > 0) {                                                   // Col Z
        const kelly = (b * avgWinProb - (1 - avgWinProb)) / b;
        bestKellyPct = Math.min(kelly, getKellyCap(propNorm ?? ''));
      }
    }
  
    const valueIcon: '🔥' | '⚠️' | '❄️' | '' =                              // Col AA
      bestEdgePct == null ? '' :
      bestEdgePct > 0.1 ? '🔥' :
      bestEdgePct > 0.05 ? '⚠️' : '❄️';
  
    const confidenceScore = seasonHitPct != null                              // Col AB
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
  
  export function determineResult(
    gameStat: number,
    line: number,
    overUnder: string
  ): 'Win' | 'Loss' | 'Push' {
    const ou = overUnder.toLowerCase();
    if (ou.includes('over'))  return gameStat > line ? 'Win' : gameStat < line ? 'Loss' : 'Push';
    if (ou.includes('under')) return gameStat < line ? 'Win' : gameStat > line ? 'Loss' : 'Push';
    return 'Push';
  }
  
  export function calculateProfitLoss(
    result: 'Win' | 'Loss' | 'Push',
    betAmount: number,
    odds: number | string
  ): number {
    if (result === 'Win') {
      return calculateNetProfit(betAmount, odds);
    }
    if (result === 'Loss') {
      return -betAmount;
    }
    return 0; // Push
  }
  
  function getKellyCap(propNorm: string): number {
    if (propNorm.includes('anytime td')) return 0.02;
    if (propNorm.includes('pass tds'))   return 0.05;
    return 0.10;
  }