import type { Bet, BetLeg, BetStatus } from '../types';

/**
 * Normalizes bet and leg data to ensure consistent field names (lowercase)
 * and correct data types regardless of the source collection.
 */
export function normalizeBet(data: any): Bet {
  // Handle case where the bet itself might be a flat record representing a single leg
  const isFlatRecord = !Array.isArray(data.legs) && !Array.isArray(data.Legs);
  const rawLegs = isFlatRecord ? [data] : (data.legs || data.Legs || []);

  // 1. Normalize Legs first
  const normalizedLegs: BetLeg[] = rawLegs.map((leg: any) => ({
    ...leg,
    id: leg.id || leg.Id || crypto.randomUUID(),
    player: leg.player || leg.Player || 'Unknown',
    team: leg.team || leg.Team || 'TBD',
    prop: leg.prop || leg.Prop || '',
    line: Number(leg.line || leg.Line || 0),
    odds: Number(leg.odds || leg.Odds || -110),
    selection: leg.selection || leg.Selection || (leg.overunder === 'Over' || leg.OverUnder === 'Over' ? 'Over' : 'Under'),
    status: (leg.status || leg.Status || 'pending').toLowerCase(),
    week: leg.week || leg.Week || null,
    gameDate: leg.gameDate || leg.GameDate || null
  }));

  // 2. Normalize the Top-Level Bet Object
  const cashOutValue = data.cashedOutAmount || data.cashout;

  return {
    ...data,
    id: data.id || data.Id,
    userId: data.userId || data.UserId || 'dev-user',
    stake: Number(data.stake || data.Stake || 0),
    odds: Number(data.odds || data.Odds || 0),
    betType: data.betType || data.BetType || (normalizedLegs.length > 1 ? 'Parlay' : 'Single'),
    status: (data.status || data.Status || 'pending').toLowerCase() as BetStatus,
    legs: normalizedLegs,
    cashedOutAmount: cashOutValue !== undefined ? Number(cashOutValue) : undefined,
    // Handle Firestore Timestamp vs ISO string vs Date.now()
    createdAt: data.createdAt || data.CreatedAt || Date.now(),
    updatedAt: data.updatedAt || data.UpdatedAt || null,
  } as Bet;
}
