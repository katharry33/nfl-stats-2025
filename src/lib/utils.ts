import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Bonus, BetLeg } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function americanToDecimal(american: number) {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

export function decimalToAmerican(decimal: number) {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else if (decimal > 1.0) {
    // Handling odds between 1.01 and 1.99
    return Math.round(-100 / (decimal - 1));
  }
  return 0; // Fallback for invalid 1.0 odds
}

export function calculateParlayOdds(oddsArray: number[]) {
  const decimalOdds = oddsArray.map(americanToDecimal);
  const combinedOddsDecimal = decimalOdds.reduce((acc, odd) => acc * odd, 1);
  const combinedOddsAmerican = decimalToAmerican(combinedOddsDecimal);
  
  return { combinedOddsDecimal, combinedOddsAmerican };
}

export function applyBoost(decimalOdds: number, boostFraction: number) {
  // boost is like 0.25 for 25%
  return decimalOdds * (1 + boostFraction);
}

export function getPayout(stake: number, americanOdds: number, isBonus?: boolean) {
  const profit = (americanOdds > 0)
    ? stake * (americanOdds / 100)
    : stake * (100 / Math.abs(americanOdds));

  if (isBonus) {
    return profit;
  }
  
  return stake + profit;
}

export function getBestBonusForParlay(legs: BetLeg[], bonuses: Bonus[]): Bonus | null {
  if (!bonuses || bonuses.length === 0 || !legs || legs.length === 0) {
    return null;
  }

  const numLegs = legs.length;
  let bestBonus: Bonus | null = null;
  let maxBoost = -1;

  for (const bonus of bonuses) {
    // Skip expired bonuses
    if (bonus.isExpired) {
      continue;
    }

    let minLegs = 1; // Default minimum legs is 1 (applies to any bet)

    // Regex to find leg requirements like "3+ leg", "SGP3+", etc.
    const legRegex = /(?:(\d+)\+?[\s-]*legs?|SGP(\d+)\+)/i;
    const nameMatch = bonus.name?.match(legRegex);
    const descMatch = bonus.description?.match(legRegex);

    let requirement: string | undefined;
    if (nameMatch) {
      requirement = nameMatch[1] || nameMatch[2];
    } else if (descMatch) {
      requirement = descMatch[1] || descMatch[2];
    }

    if (requirement) {
      minLegs = parseInt(requirement, 10);
    }

    // Check if the parlay meets the bonus requirements
    if (numLegs >= minLegs) {
      if (bonus.boost !== undefined && bonus.boost > maxBoost) {
        maxBoost = bonus.boost;
        bestBonus = bonus;
      }
    }
  }

  return bestBonus;
}
