// src/lib/utils/payout.ts

/**
 * Converts American odds to decimal profit multiplier.
 * +150 → 1.5  |  -110 → 0.909
 */
export function oddsToDecimal(americanOdds: number): number {
  if (americanOdds > 0) return americanOdds / 100;
  return 100 / Math.abs(americanOdds);
}

export type PayoutDisplay = {
  label: string;
  amount: number;
  type: 'won' | 'lost' | 'cashout' | 'pending' | 'void';
};

/**
 * Calculates payout for a bet, factoring in boost percentage.
 *
 * Boost applies to the PROFIT portion only:
 *   boostedProfit = profit * (1 + boostPct / 100)
 *   totalPayout   = stake + boostedProfit
 *
 * - Won:        boosted profit actually paid
 * - Lost:       what would have been paid (context only)
 * - Cashed Out: cashedOutAmount field (exact value)
 * - Pending:    potential boosted profit
 * - Void:       stake returned
 */
export function getBetPayout(bet: any): PayoutDisplay {
  const stake   = Number(bet.stake ?? bet.wager ?? 0);
  const status  = (bet.status ?? '').toLowerCase();
  const odds    = Number(bet.odds ?? bet.legs?.[0]?.odds ?? -110);
  const boostPct = typeof bet.boostPct === 'number' ? bet.boostPct : 0; // e.g. 25 for 25%

  const baseProfit    = stake * oddsToDecimal(odds);
  const boostedProfit = baseProfit * (1 + boostPct / 100);

  // Use stored payout if available (DK bets have a `payout` field)
  const storedPayout = Number(bet.payout ?? 0);

  switch (status) {
    case 'won':
      return {
        label: boostPct ? `Paid (+${boostPct}% boost)` : 'Paid',
        // Prefer stored payout from DK if available, else calculate
        amount: storedPayout > 0 ? storedPayout : boostedProfit,
        type: 'won',
      };

    case 'lost':
      return {
        label: "Would've Paid",
        amount: boostedProfit,
        type: 'lost',
      };

    case 'cashed out':
      return {
        label: 'Cashed Out',
        amount: Number(bet.cashedOutAmount ?? 0),
        type: 'cashout',
      };

    case 'void':
      return {
        label: 'Returned',
        amount: stake,
        type: 'void',
      };

    case 'pending':
    default:
      return {
        label: boostPct ? `To Pay (+${boostPct}% boost)` : 'To Pay',
        amount: boostedProfit,
        type: 'pending',
      };
  }
}

export function formatPayout(display: PayoutDisplay): string {
  if (display.amount === 0 && display.type === 'pending') return '...';
  const sign = display.type === 'won' ? '+' : '';
  return `${sign}$${display.amount.toFixed(2)}`;
}