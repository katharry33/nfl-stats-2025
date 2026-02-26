// src/lib/bets.ts
// Utility functions for constructing BetLeg / Bet objects from various prop sources.

import type { BetLeg, Bet } from '@/lib/types';

/** Build a BetLeg from a raw NFLProp / PropData document */
export function propToLeg(
  prop: any,
  selection: 'Over' | 'Under',
  overrides: Partial<BetLeg> = {}
): BetLeg {
  const propId = prop.id ?? `${prop.Player ?? prop.player ?? ''}-${prop.Prop ?? prop.prop ?? ''}-${prop.Line ?? prop.line ?? 0}`;

  const odds =
    selection === 'Over'
      ? (prop.overOdds ?? prop.OverOdds ?? prop.odds ?? prop.Odds ?? -110)
      : (prop.underOdds ?? prop.UnderOdds ?? prop.odds ?? prop.Odds ?? -110);

  return {
    id:        propId,
    player:    prop.player    ?? prop.Player    ?? '',
    team:      (prop.team     ?? prop.Team      ?? '').toString().toUpperCase(),
    prop:      propId,
    line:      Number(prop.line ?? prop.Line ?? 0),
    selection,
    odds:      Number(odds),
    matchup:   prop.matchup   ?? prop.Matchup   ?? '',
    week:      prop.week      ?? prop.Week      ?? undefined,
    status:    'pending',
    gameDate:  prop.gameDate  ?? prop.GameDate  ?? new Date().toISOString(),
    source:    prop.source    ?? 'prop-library',
    ...overrides,
  };
}

/** Build a BetLeg from a normalised (lowercase-key) prop object */
export function normalizedPropToLeg(
  prop: {
    id?: string;
    player?: string;
    team?: string;
    prop?: string;
    line?: number | string;
    overOdds?: number | string;
    underOdds?: number | string;
    odds?: number | string;
    matchup?: string;
    week?: number;
    gameDate?: string;
    source?: string;
  },
  selection: 'Over' | 'Under',
  overrides: Partial<BetLeg> = {}
): BetLeg {
  const propId = prop.id ?? `${prop.player ?? ''}-${prop.prop ?? ''}-${prop.line ?? 0}`;
  const odds =
    selection === 'Over'
      ? Number(prop.overOdds ?? prop.odds ?? -110)
      : Number(prop.underOdds ?? prop.odds ?? -110);

  const leg: BetLeg = {
    id:       propId,
    player:   prop.player  ?? '',
    team:     (prop.team   ?? '').toUpperCase(),
    prop:     propId,
    line:     Number(prop.line ?? 0),
    selection,
    odds,
    matchup:  prop.matchup ?? '',
    week:     prop.week,
    status:   'pending',
    gameDate: prop.gameDate ?? new Date().toISOString(),
    source:   prop.source  ?? 'prop-library',
    ...overrides,
  };

  return leg;
}

/** Build a minimal Bet wrapper around a single leg */
export function legToBet(leg: BetLeg): Bet {
  return {
    id:       leg.id,
    userId:   'dev-user',
    betType:  'Single',
    isParlay: false,
    stake:    0,
    odds:     Number(leg.odds),
    status:   leg.status ?? 'pending',
    legs:     [leg],
    createdAt: new Date().toISOString(),
  };
}