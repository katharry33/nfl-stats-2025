
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
