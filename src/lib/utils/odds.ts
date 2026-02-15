
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
    if (isBonus) {
        if (odds > 0) {
            return stake * (odds / 100);
        } else {
            return stake / (Math.abs(odds) / 100);
        }
    } else {
        if (odds > 0) {
            return stake * (odds / 100) + stake;
        } else {
            return stake / (Math.abs(odds) / 100) + stake;
        }
    }
}
