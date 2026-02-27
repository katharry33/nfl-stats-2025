import { BetLeg } from '../types';

export function calculateParlayStatus(legs: BetLeg[]): 'pending' | 'won' | 'lost' | 'void' {
  if (!legs || legs.length === 0) return 'pending';

  // 1. Any loss means the whole thing is lost
  if (legs.some(leg => leg.status === 'lost')) return 'lost';

  // 2. If there are still pending legs, the parlay is pending
  if (legs.some(leg => leg.status === 'pending')) return 'pending';

  // 3. If everything is void, the parlay is void
  if (legs.every(leg => leg.status === 'void')) return 'void';

  // 4. If we reached here, all legs are either 'won' or 'void'
  return 'won';
}