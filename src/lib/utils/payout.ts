/**
 * Converts American Odds to a Decimal Multiplier
 * Example: -110 => 1.909, +100 => 2.0, +200 => 3.0
 */
export const americanToDecimal = (odds: number): number => {
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
};

/**
 * Calculates the total potential payout and profit for a stake
 * @param stake - The amount wagered
 * @param legs - Array of American Odds for each leg
 */
export const calculateParlay = (stake: number, legs: number[]) => {
  if (!stake || stake <= 0 || legs.length === 0) {
    return { payout: 0, profit: 0, totalOdds: 0 };
  }

  // Multiply all decimal odds together
  const totalMultiplier = legs.reduce((acc, odds) => {
    return acc * americanToDecimal(odds);
  }, 1);

  const payout = stake * totalMultiplier;
  const profit = payout - stake;

  // Convert the total decimal multiplier back to American Odds for display
  const totalAmericanOdds = decimalToAmerican(totalMultiplier);

  return {
    payout: Number(payout.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    totalOdds: totalAmericanOdds,
  };
};

/**
 * Converts Decimal Multiplier back to American Odds
 */
export const decimalToAmerican = (decimal: number): number => {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
};

/**
 * Formats odds string (e.g., adds '+' to positive numbers)
 */
export const formatOdds = (odds: number): string => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

/**
 * A simple function to calculate payout from stake and odds.
 */
export const getBetPayout = (stake: number, odds: number): number => {
    const decimal = americanToDecimal(odds);
    return stake * decimal;
}
