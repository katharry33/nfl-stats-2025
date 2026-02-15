/**
 * Kelly Criterion Wager Calculator
 * Uses a conservative Quarter-Kelly approach to protect the bankroll.
 */
export const calculateRecommendation = (
  hitRate: number, 
  odds: number | string, 
  bankroll: number, 
  bonusBoost: number = 0
) => {
  const numericOdds = Number(odds);
  
  // 1. Convert American Odds to Decimal (e.g., -110 -> 1.909)
  // Logic: If odds are -110, decimal is (100/110) + 1 = 1.909
  const decimalOdds = numericOdds > 0 
    ? (numericOdds / 100) + 1 
    : (100 / Math.abs(numericOdds)) + 1;
  
  // 2. Apply Profit Boost
  // Most books boost the *profit* part, not the stake.
  // Example: 2.0 odds (+100) with 50% boost becomes 2.5 odds (+150).
  const boostedDecimalOdds = decimalOdds + (decimalOdds - 1) * (bonusBoost / 100);
  
  const p = hitRate / 100; // Probability of winning
  const q = 1 - p;         // Probability of losing
  const b = boostedDecimalOdds - 1; // Net odds (Profit per $1 wagered)

  // 3. Safety Check: Prevent Division by Zero if odds are somehow 1.0
  if (b <= 0) return { suggestedWager: 0, expectedValue: 0 };

  // 4. Kelly Criterion Formula: f* = (bp - q) / b
  const fraction = (b * p - q) / b;
  
  // 5. Apply "Quarter Kelly" for risk management
  // Standard Kelly is famously volatile; Quarter Kelly is the "Sweet Spot."
  const suggestedWager = Math.max(0, bankroll * (fraction / 4));
  
  // 6. Calculate Expected Value (ROI %)
  // (Probability * Boosted Payout) - 1
  const expectedValue = (p * boostedDecimalOdds - 1) * 100;

  return {
    suggestedWager: parseFloat(suggestedWager.toFixed(2)),
    expectedValue: parseFloat(expectedValue.toFixed(2)), // ROI %
    fraction: parseFloat((fraction * 100).toFixed(2)) // Percent of bankroll
  };
};