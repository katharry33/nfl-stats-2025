// src/lib/services/bet-normalizer.ts

import { getWeekFromDate, parseLineField } from '@/lib/utils/nfl-week';

export function normalizeBet(raw: any): any {
  const gameDateRaw = raw.gameDate ?? raw.date ?? null;

  const derivedWeek =
    raw.week ??
    raw.legs?.[0]?.week ??
    getWeekFromDate(gameDateRaw ?? raw.createdAt) ??
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

  // FIX: If it's a flat leg (no legs array), create a synthetic leg
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
    const legWeek   = leg.week ?? getWeekFromDate(leg.gameDate ?? gameDateRaw ?? raw.createdAt) ?? derivedWeek;

    return {
      ...leg,
      player,
      line: parsed.line,
      selection,
      week: legWeek,
      matchup: leg.matchup || raw.matchup || '',
      prop: leg.prop || raw.prop || '',
      odds: legOdds,
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
  };
}

export function groupBets(rawDocs: any[]): any[] {
  const groups: Record<string, any> = {};
  const order: string[] = [];

  rawDocs.forEach((raw) => {
    const bet = normalizeBet(raw);
    const parlayId = raw.parlayid || raw.dk_parlay_id;

    const groupId = parlayId || bet.id;

    if (!groups[groupId]) {
      groups[groupId] = {
        ...bet,
        id: groupId,
        betType: parlayId ? 'Parlay' : 'Single',
        legs: [], // Legs will be merged from normalized bets
      };
      order.push(groupId);
    }

    const group = groups[groupId];

    if (parlayId) {
      group.legs.push(...bet.legs);
    } else {
      group.legs = bet.legs;
    }

    if (!group.stake && bet.stake) group.stake = bet.stake;
    if (!group.odds && bet.odds) group.odds = bet.odds;
    if (!group.boost && bet.boost) { group.boost = bet.boost; group.boostPct = bet.boostPct; }
    if (!group.gameDate && bet.gameDate) group.gameDate = bet.gameDate;
    if (!group.week && bet.week) group.week = bet.week;
    group.status = bet.status || group.status; 
  });

  return order.map(id => groups[id]).filter(Boolean);
}
