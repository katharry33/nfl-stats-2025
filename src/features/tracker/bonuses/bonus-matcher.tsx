// src/lib/utils/bonus-matcher.ts
import type { Bonus, BetType } from "@/lib/types";

export interface BonusMatchCriteria {
  betType: BetType;
  stake?: number;
}

/**
 * Find the best matching bonus for a given bet
 */
export function findBestBonus(
  activeBonuses: Bonus[], 
  criteria: BonusMatchCriteria
): Bonus | null {
  const eligibleBonuses = activeBonuses.filter(bonus => {
    // Check if bonus is active
    if (bonus.status !== 'active') return false;
    
    // Check if bet type matches
    const matchesType = bonus.betType === 'any' || bonus.betType === criteria.betType;
    if (!matchesType) return false;
    
    // Check if stake is within max wager
    if (criteria.stake && criteria.stake > bonus.maxWager) return false;
    
    // Check if not expired
    const expirationDate = bonus.expirationDate instanceof Date 
      ? bonus.expirationDate 
      : new Date(bonus.expirationDate);
    if (expirationDate < new Date()) return false;
    
    return true;
  });

  // Return the bonus with highest boost percentage
  return eligibleBonuses.sort((a, b) => b.boost - a.boost)[0] || null;
}

/**
 * Calculate boosted payout
 */
export function calculateBoostedPayout(
  stake: number,
  odds: number,
  boostPercentage: number
): number {
  const decimalOdds = odds > 0 
    ? (odds / 100) + 1 
    : (100 / Math.abs(odds)) + 1;
  
  const basePayout = stake * decimalOdds;
  const profit = basePayout - stake;
  const boostedProfit = profit * (1 + boostPercentage / 100);
  
  return stake + boostedProfit;
}