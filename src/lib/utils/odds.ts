
export function calculateParlayOdds(odds: number[]): number {
    let decimalOdds = odds.map(o => {
        if (o > 0) {
            return (o / 100) + 1;
        } else {
            return (100 / Math.abs(o)) + 1;
        }
    });
    let combinedDecimalOdds = decimalOdds.reduce((a, b) => a * b, 1);
    if (combinedDecimalOdds >= 2) {
        return (combinedDecimalOdds - 1) * 100;
    } else {
        return -100 / (combinedDecimalOdds - 1);
    }
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
