/**
 * Converts American odds to decimal odds.
 * @param americanOdds - The American odds (e.g., -110, +120).
 * @returns The decimal odds.
 */
function americanToDecimal(americanOdds: number): number {
  if (americanOdds >= 100) {
    return 1 + americanOdds / 100;
  } else {
    return 1 - 100 / americanOdds;
  }
}

/**
 * Calculates the optimal wager size and other metrics based on the Kelly Criterion.
 * @param estimatedHitRate - The user's estimated probability of winning (e.g., 55 for 55%).
 * @param americanOdds - The American odds for the bet (e.g., '-110').
 * @param balance - The current available balance.
 * @returns An object with the recommended wager, Kelly fraction, and expected value.
 */
export function calculateRecommendation(estimatedHitRate: number, americanOdds: string, balance: number) {
  const oddsNum = parseInt(americanOdds, 10);
  if (isNaN(oddsNum) || balance <= 0) {
    return { recommendedWager: 0, kellyFraction: 0, expectedValue: 0 };
  }

  const decimalOdds = americanToDecimal(oddsNum);
  const winProbability = estimatedHitRate / 100;

  // Expected Value (the edge)
  const expectedValue = (decimalOdds - 1) * winProbability - (1 - winProbability);

  // Kelly Criterion formula
  const kellyDenominator = decimalOdds - 1;
  const kellyFraction = kellyDenominator > 0 ? expectedValue / kellyDenominator : 0;

  let recommendedWager = 0;
  if (kellyFraction > 0) {
    recommendedWager = balance * kellyFraction;
  }

  return {
    recommendedWager,
    kellyFraction,
    expectedValue,
  };
}
