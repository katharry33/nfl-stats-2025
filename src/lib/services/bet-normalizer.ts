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

  const rawLegs: any[] = Array.isArray(raw.legs) ? raw.legs : [];

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

/**
 * Groups Firestore documents into logical bets.
 *
 * KEY RULE: parlayid wins over everything.
 *   - If a doc has a parlayid → always group with siblings by parlayid
 *   - If a doc has no parlayid AND has a legs array → it's a self-contained app bet
 *   - If a doc has no parlayid AND no legs → treat as a standalone single
 */
export function groupBets(rawDocs: any[]): any[] {
  const groups: Record<string, any> = {};
  const order: string[] = [];

  rawDocs.forEach((raw) => {
    const bet = normalizeBet(raw);

    // ── Has parlayid → always group by it (DK/Legacy multi-leg bets) ──────
    if (raw.parlayid) {
      const groupId = raw.parlayid;

      if (!groups[groupId]) {
        groups[groupId] = {
          ...bet,
          id: groupId,
          legs: [],
          betType: raw.bettype || 'Parlay',
        };
        order.push(groupId);
      }

      const group = groups[groupId];

      // Push all legs from this doc into the group
      if (bet.legs.length > 0) {
        group.legs.push(...bet.legs);
      }

      // Fill group-level fields from the first doc that has them
      if (!group.stake    && bet.stake)  group.stake    = bet.stake;
      if (!group.odds     && bet.odds)   group.odds     = bet.odds;
      if (!group.boost    && bet.boost)  { group.boost = bet.boost; group.boostPct = bet.boostPct; }
      if (!group.gameDate && bet.gameDate) group.gameDate = bet.gameDate;
      if (!group.week     && bet.week)   group.week     = bet.week;
      // Status: if any leg is "won", treat as partial; last seen wins for simplicity
      group.status = bet.status || group.status;
      return;
    }

    // ── No parlayid + has legs array → self-contained app bet ────────────
    if (Array.isArray(raw.legs) && raw.legs.length > 0) {
      if (!groups[bet.id]) {
        groups[bet.id] = bet;
        order.push(bet.id);
      }
      return;
    }

    // ── No parlayid, no legs → standalone single ──────────────────────────
    if (!groups[bet.id]) {
      groups[bet.id] = bet;
      order.push(bet.id);
    }
  });

  return order.map(id => groups[id]).filter(Boolean);
}