'use client';

import type { Bonus, BetType } from "@/lib/types";
import { resolveFirestoreDate } from "@/lib/types"; // Using the centralized helper

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
    if (criteria.stake && bonus.maxWager && criteria.stake > bonus.maxWager) return false;
    
    // Check if not expired
    // *** FIXED: Use the helper to safely parse the date object ***
    const expirationDate = resolveFirestoreDate(bonus.expirationDate);
    if (!expirationDate || expirationDate < new Date()) return false;
    
    return true;
  });

  // Return the bonus with highest boost percentage
  return eligibleBonuses.sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))[0] || null;
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
