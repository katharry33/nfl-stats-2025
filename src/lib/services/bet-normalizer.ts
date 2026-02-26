// src/lib/services/bet-normalizer.ts

import { getWeekFromDate, parseLineField } from '@/lib/utils/nfl-week';

const renderDate = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
        if (dateVal.seconds) {
            return new Date(dateVal.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        }
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch {
        return '—';
    }
};

/**
 * Takes a raw bet object from any data source and cleans it into a single,
 * consistent format for use throughout the application.
 */
export function normalizeBet(raw: any): any {
  // --- NORMALIZE TOP-LEVEL FIELDS ---
  const gameDateRaw = raw.gameDate ?? raw.date ?? raw.createdAt ?? raw.updatedAt ?? new Date().toISOString();
  const week = raw.Week ?? raw.week ?? getWeekFromDate(gameDateRaw) ?? null;
  const stake = Number(raw.stake ?? raw.wager ?? 0);
  
  // Normalize status, checking all known variations including 'Actual Result'.
  const status = (raw["Actual Result"] ?? raw.result ?? raw.status ?? 'pending').toLowerCase();

  const odds = typeof raw.odds === 'string' ? parseFloat(raw.odds.replace('+', '')) : typeof raw.odds === 'number' ? raw.odds : null;
  const player = raw.Player ?? raw.player ?? raw.playerteam ?? 'Legacy Bet';
  const prop = raw.Prop ?? raw.prop ?? '';
  const matchup = raw.Matchup ?? raw.matchup ?? 'N/A';

  // --- NORMALIZE BOOST ---
  const boostRaw = raw.boost ?? raw.boostpercentage ?? raw.boostPercentage ?? null;
  const boostPct: number | null =
    typeof boostRaw === 'number' ? boostRaw
    : typeof boostRaw === 'string' && /^\d+(\.\d+)?$/.test(boostRaw.trim()) ? parseFloat(boostRaw)
    : null;
  const boostDisplay: string | null =
    boostPct !== null ? `${boostPct}%`
    : typeof boostRaw === 'string' && boostRaw && !['none', 'no', ''].includes(boostRaw.toLowerCase()) ? boostRaw
    : null;

  // --- NORMALIZE LEGS ---
  let rawLegs: any[] = Array.isArray(raw.legs) ? raw.legs : [];

  if (rawLegs.length === 0) {
    const lineRaw = raw.Line ?? raw.line ?? '';
    const parsed = parseLineField(lineRaw);
    rawLegs = [{
      ...raw,
      player: player,     
      prop: prop,
      matchup: matchup,
      line: parsed.line,
      selection: raw.selection || parsed.selection || '',
      status: status,
      gameDate: gameDateRaw,
    }];
  }

  const normalizedLegs = rawLegs.map((leg: any) => {
    const legLineRaw = leg.Line ?? leg.line ?? '';
    const parsed = parseLineField(legLineRaw);
    
    const legPlayer = leg.Player ?? leg.player ?? player;
    const legProp = leg.Prop ?? leg.prop ?? prop;
    const legMatchup = leg.Matchup ?? leg.matchup ?? matchup;
    const legSelection = leg.selection ?? parsed.selection ?? '';
    
    const legOdds = typeof leg.odds === 'string' ? parseFloat(leg.odds.replace('+', ''))
                  : typeof leg.odds === 'number' ? leg.odds
                  : odds; 
                  
    const legStatus = (leg["Actual Result"] ?? leg.result ?? leg.status ?? status).toLowerCase();
    const legWeek = leg.Week ?? leg.week ?? getWeekFromDate(leg.gameDate ?? gameDateRaw) ?? week;

    const legOddsDisplay = typeof legOdds === 'number' 
      ? (legOdds > 0 ? `+${legOdds}` : `${legOdds}`) 
      : null;

    return {
      ...leg,
      player: legPlayer,
      prop: legProp,
      matchup: legMatchup,
      line: parsed.line,
      selection: legSelection,
      odds: legOdds,
      legOddsDisplay: legOddsDisplay,
      status: legStatus,
      week: legWeek,
      gameDate: leg.gameDate ?? gameDateRaw,
    };
  });
  
  // --- RETURN FINAL NORMALIZED OBJECT ---
  return {
    ...raw,
    player,
    prop,
    matchup,
    stake,
    week,
    odds,
    status,
    gameDate: gameDateRaw,
    boost: boostDisplay,
    boostPct,
    boostRaw,
    legs: normalizedLegs,
    displayDate: renderDate(gameDateRaw),
    displayWeek: week ? `WK ${week}` : '—',
    betType: (raw.parlayid || raw.dk_parlay_id) ? 'Parlay' : 'Single',
  };
}

/**
 * Groups raw documents into parlays or single bets.
 */
export function groupBets(rawDocs: any[]): any[] {
  const groups: Record<string, any> = {};
  const singles: any[] = [];

  // First pass: group all the legs of parlays.
  rawDocs.forEach((raw) => {
    const parlayId = raw.parlayid || raw.dk_parlay_id;
    if (parlayId) {
      if (!groups[parlayId]) {
        groups[parlayId] = {
          ...raw, // Use the first doc as the base for the parlay.
          id: parlayId,
          legs: [],
          betType: 'Parlay'
        };
      }
      // A parlay is composed of multiple documents, each representing a leg.
      // We normalize the doc as a stand-alone bet to get its leg info.
      const legDocAsBet = normalizeBet(raw);
      groups[parlayId].legs.push(...legDocAsBet.legs);
    } else {
      // If it has no parlay ID, it's a single bet.
      singles.push(raw);
    }
  });
  
  const groupedParlays = Object.values(groups).map(p => normalizeBet(p));
  const normalizedSingles = singles.map(s => normalizeBet(s));

  // Combine and return.
  return [...groupedParlays, ...normalizedSingles];
}
