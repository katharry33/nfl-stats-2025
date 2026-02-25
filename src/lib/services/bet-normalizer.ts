// src/lib/services/bet-normalizer.ts

import { getWeekFromDate, parseLineField } from '@/lib/utils/nfl-week';

export function normalizeBet(raw: any): any {
  const gameDateRaw = raw.gameDate ?? raw.date ?? raw.createdAt ?? new Date().toISOString();

  const derivedWeek =
    raw.week ??
    raw.legs?.[0]?.week ??
    getWeekFromDate(gameDateRaw) ??
    null;

  const stake = Number(raw.stake ?? raw.wager ?? 0);

  const topOdds =
    typeof raw.odds === 'string' ? parseFloat(raw.odds.replace('+', ''))
    : typeof raw.odds === 'number' ? raw.odds
    : null;

  const status =
    raw.status ||
    (raw.result ? raw.result.toLowerCase() : 'pending');

  const boostRaw = raw.boost ?? raw.boostpercentage ?? raw.boostPercentage ?? null;
  const boostPct: number | null =
    typeof boostRaw === 'number' ? boostRaw
    : typeof boostRaw === 'string' && /^\d+(\.\d+)?$/.test(boostRaw.trim()) ? parseFloat(boostRaw)
    : null;
  const boostDisplay: string | null =
    boostPct !== null ? `${boostPct}%`
    : typeof boostRaw === 'string' && boostRaw && !['none', 'no', ''].includes(boostRaw.toLowerCase()) ? boostRaw
    : null;

  let rawLegs: any[] = Array.isArray(raw.legs) ? raw.legs : [];

  if (rawLegs.length === 0) {
    const parsed = parseLineField(raw.line ?? '');
    rawLegs = [{
      ...raw,
      player: raw.playerteam || raw.player || 'Legacy Bet',
      prop: raw.prop || '',
      line: parsed.line,
      selection: raw.selection || parsed.selection || '',
      status: raw.result?.toLowerCase() || raw.status || 'pending',
      gameDate: raw.date || raw.createdAt,
    }];
  }

  const normalizedLegs = rawLegs.map((leg: any) => {
    const parsed    = parseLineField(leg.line ?? leg.Line);
    const selection = leg.selection || parsed.selection || '';
    const player =
      (!leg.player || leg.player === 'Legacy Bet')
        ? (raw.playerteam || raw.player || 'Legacy Bet')
        : leg.player;
    const legOdds =
      typeof leg.odds === 'string' ? parseFloat(leg.odds.replace('+', ''))
      : typeof leg.odds === 'number' ? leg.odds
      : topOdds;
    const legStatus = leg.status || (leg.result ? leg.result.toLowerCase() : status);
    const legWeek   = leg.week ?? getWeekFromDate(leg.gameDate ?? gameDateRaw) ?? derivedWeek;

    const legOddsDisplay = typeof legOdds === 'number' 
      ? (legOdds > 0 ? `+${legOdds}` : legOdds) 
      : legOdds;
      
    const impliedBonus = typeof legOdds === 'number'
      ? (legOdds > 0 ? 5 * (legOdds / 100) : 5 * (100 / Math.abs(legOdds)))
      : null;

    return {
      ...leg,
      player,
      line: parsed.line,
      selection,
      week: legWeek,
      matchup: leg.matchup || raw.matchup || 'N/A',
      prop: leg.prop || raw.prop || '',
      odds: legOdds,
      legOddsDisplay,
      impliedBonus,
      status: legStatus,
      gameDate: leg.gameDate ?? gameDateRaw,
    };
  });

  return {
    ...raw,
    stake,
    week: derivedWeek,
    odds: topOdds,
    status,
    gameDate: gameDateRaw,
    boost: boostDisplay,
    boostPct,
    boostRaw,
    legs: normalizedLegs,
    matchup: raw.matchup || 'N/A',
    team: raw.team || 'TBD',
  };
}

export function groupBets(rawDocs: any[]): any[] {
  return rawDocs.map(doc => normalizeBet(doc));
}
