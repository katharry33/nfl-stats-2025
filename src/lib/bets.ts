import type { Bet, BetLeg, PropData } from './types';
import { addBet as addBetToDb } from './firebase/server/bet-actions';

// Enhanced normalizeBetLeg function
export const normalizeBetLeg = (leg: any): BetLeg => {
  // Use fallbacks (??) to prevent "string | undefined is not assignable to string"
  const player = leg.player || leg.Player || "Unknown";
  const propName = leg.prop || leg.Prop || "";
  const propId = leg.propId || leg.id || "";
  
  if (
    !propId ||
    !player ||
    !propName ||
    typeof leg.line !== 'number' ||
    typeof leg.odds !== 'number' ||
    typeof leg.week !== 'number'
  ) {
    // Try to build a valid leg from PropData if that's what was passed
    if (leg.Player && leg.Prop && leg.Line && leg.Odds && leg.week) {
      const prop = leg as PropData;
      const selection = prop['Over/Under?'] === 'Over' ? 'Over' : 'Under';

      return {
        id: crypto.randomUUID(),
        source: 'manual',
        propId: prop.id,
        player: prop.Player || prop.player || 'Unknown',
        prop: prop.Prop || "Unknown Prop", // Fallback for Error 2322
        line: prop.Line ?? prop.line ?? 0,
        selection,
        odds: prop.Odds ?? prop.odds ?? -110,
        week: prop.week, 
        status: 'pending',
      };
    }
    throw new Error(`Invalid leg data received: ${JSON.stringify(leg)}`);
  }

  // Handle the overUnder to selection migration
  const selection = leg.selection || leg.overUnder;
  if (selection !== 'Over' && selection !== 'Under') {
    const lowerSelection = typeof selection === 'string' ? selection.toLowerCase() : '';
    if (lowerSelection === 'over') {
      return { ...leg, selection: 'Over', prop: propName, status: 'pending' };
    }
    if (lowerSelection === 'under') {
      return { ...leg, selection: 'Under', prop: propName, status: 'pending' };
    }
    throw new Error(`Invalid selection value: \"${selection}\" in leg: ${JSON.stringify(leg)}`);
  }

  // Return a clean, strictly-typed BetLeg object
  const normalizedLeg: BetLeg = {
    id: crypto.randomUUID(),
    source: 'betting-log',
    propId: propId,
    player: player,
    prop: propName, // FIXED: Guaranteed string
    line: leg.line,
    selection: selection,
    odds: leg.odds,
    week: leg.week,
    status: 'pending',
  };

  return normalizedLeg;
};

// Create a BetLeg from a PropData object
export const createBetLegFromProp = (prop: PropData, selection: 'Over' | 'Under'): BetLeg => {
  return {
    id: crypto.randomUUID(),
    source: 'manual',
    propId: prop.id,
    player: prop.Player || prop.player || 'Unknown',
    prop: prop.Prop || "Unknown Prop", // FIXED: Fallback for Error 2322
    line: prop.Line ?? prop.line ?? 0,
    selection: selection,
    odds: prop.Odds ?? prop.odds ?? -110,
    week: prop.week,
    status: 'pending',
  };
};

// Calculate total odds for a parlay
export const calculateParlayOdds = (legs: BetLeg[]): number => {
  if (legs.length === 0) return 0;

  const totalOddsMultiplier = legs.reduce((acc, leg) => {
    const odds = typeof leg.odds === 'string' ? parseFloat(leg.odds) : leg.odds ?? 0;
    if (odds > 0) {
      return acc * (odds / 100 + 1);
    } else {
      return acc * (100 / Math.abs(odds) + 1);
    }
  }, 1);

  return totalOddsMultiplier > 1
    ? (totalOddsMultiplier - 1) * 100
    : -100 / (totalOddsMultiplier - 1);
};

// Calculate potential payout
export const calculatePayout = (stake: number, odds: number): number => {
  if (odds > 0) {
    return stake * (odds / 100);
  } else {
    const absoluteOdds = Math.abs(odds);
    return absoluteOdds === 0 ? 0 : stake * (100 / absoluteOdds);
  }
};

// Validate a bet before submission
export const validateBet = (bet: Omit<Bet, 'id'>): { isValid: boolean; error?: string } => {
  if (bet.stake <= 0) {
    return { isValid: false, error: 'Stake must be positive.' };
  }
  if (!bet.legs || bet.legs.length === 0) {
    return { isValid: false, error: 'A bet must have at least one leg.' };
  }

  try {
    bet.legs.forEach(leg => normalizeBetLeg(leg));
  } catch (error: any) {
    return { isValid: false, error: `Invalid leg: ${error.message}` };
  }

  return { isValid: true };
};

// Alias the exported function
export const addBet = addBetToDb;
