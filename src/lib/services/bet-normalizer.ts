import type { Bet } from '../types';

export function normalizeBet(bet: any): Bet {
  // Normalize the bet data structure
  return {
    ...bet,
    stake: Number(bet.stake) || 0,
    odds: Number(bet.odds) || 0,
    createdAt: bet.createdAt || Date.now(),
    status: bet.status || 'Pending',
    result: bet.result || null
  } as Bet;
}
