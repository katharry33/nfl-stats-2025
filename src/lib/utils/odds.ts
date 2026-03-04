export function toDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

export function toAmerican(decimalOdds: number): number {
    if (decimalOdds >= 2) {
        return (decimalOdds - 1) * 100;
    } else {
        return -100 / (decimalOdds - 1);
    }
}

export function calculateParlayOdds(odds: number[]): number {
    let decimalOdds = odds.map(o => toDecimal(o));
    let combinedDecimalOdds = decimalOdds.reduce((a, b) => a * b, 1);
    return toAmerican(combinedDecimalOdds);
}

export function calculatePayout(stake: number, odds: number, isBonus: boolean): number {
    let profit;
    if (odds > 0) {
        profit = stake * (odds / 100);
    } else {
        profit = stake / (Math.abs(odds) / 100);
    }

    if (isBonus) {
        return profit;
    } else {
        return stake + profit;
    }
}

/**
 * Calculates the betting edge percentage.
 * @param odds - The American odds (e.g., -110, +150)
 * @param projection - Your projected probability of the outcome (0.0 to 1.0)
 */
export function calculateEdge(odds: number, projection: number): number {
  if (!odds) {
    return 0;
  }

  let impliedProbability: number;

  if (odds > 0) {
    // Positive odds (Underdog)
    impliedProbability = 100 / (odds + 100);
  } else {
    // Negative odds (Favorite)
    impliedProbability = Math.abs(odds) / (Math.abs(odds) + 100);
  }

  // Edge is the difference (e.g., 0.60 projected - 0.52 implied = 0.08 or 8% edge)
  return projection - impliedProbability;
}
