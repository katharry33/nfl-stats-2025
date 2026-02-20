// src/lib/services/bet-normalizer.ts
// Normalizes both DK-imported and app-entered bets into a consistent Bet shape

import { getWeekFromDate, parseLineField } from '@/lib/utils/nfl-week';
import { resolveDate } from '@/lib/utils/dates';

export function normalizeBet(raw: any): any {
  const isLegacyOrDK = !raw.week && (raw.date || raw.parlayid || raw.bettype);

  // ── Derive week from date if not stored ───────────────────────────────────
  const derivedWeek =
    raw.week ??
    raw.legs?.[0]?.week ??
    getWeekFromDate(raw.createdAt ?? raw.date ?? raw.gameDate) ??
    null;

  // ── Normalize legs ────────────────────────────────────────────────────────
  const rawLegs: any[] = Array.isArray(raw.legs) ? raw.legs : [];

  const normalizedLegs = rawLegs.map((leg: any) => {
    // DK bets embed Over/Under in the line field: "Under 250.5"
    const parsed = parseLineField(leg.line ?? leg.Line);

    // selection may be empty string on DK bets — fall back to parsed
    const selection = leg.selection || parsed.selection || '';

    // player may be in leg.player or top-level playerteam (DK format)
    const player = leg.player || raw.playerteam || leg.playerteam || 'Legacy Bet';

    // week per leg: stored leg week → derived from bet date
    const legWeek =
      leg.week ??
      getWeekFromDate(leg.gameDate ?? raw.createdAt ?? raw.date) ??
      derivedWeek;

    return {
      ...leg,
      player,
      line: parsed.line,
      selection: selection || parsed.selection || '',
      week: legWeek,
      // DK bets store odds as strings ("+850") — normalize to number
      odds: typeof leg.odds === 'string' ? parseFloat(leg.odds.replace('+', '')) : (leg.odds ?? null),
    };
  });

  // ── Top-level odds normalization ──────────────────────────────────────────
  const topOdds =
    typeof raw.odds === 'string'
      ? parseFloat(raw.odds.replace('+', ''))
      : (raw.odds ?? null);

  // ── Boost: handle both string ("No Sweat") and number (15 → "15%") ───────
  const boost = raw.boost ?? raw.boostpercentage ?? null;
  const boostDisplay =
    typeof boost === 'number'
      ? `${boost}%`
      : typeof boost === 'string' && boost && boost !== 'None' && boost !== 'No'
        ? boost
        : null;

  return {
    ...raw,
    week: derivedWeek,
    odds: topOdds,
    boost: boostDisplay,           // normalized boost string or null
    boostRaw: boost,               // original value for edit modal
    legs: normalizedLegs,
  };
}