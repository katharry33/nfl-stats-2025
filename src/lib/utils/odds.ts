// src/lib/utils/odds.ts

/**
 * Converts American odds to decimal odds.
 * Example: -110 -> 1.91, +150 -> 2.5
 */
export function americanToDecimal(american: number): number {
    if (american >= 100) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }
  
  /**
   * Converts American odds to implied probability.
   * Example: -110 -> 0.5238 (52.38%)
   */
  export function americanToProbability(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      const positive = Math.abs(american);
      return positive / (positive + 100);
    }
  }
  
  /**
   * Formats a probability as a percentage string.
   */
  export function formatProb(prob: number): string {
    return `${(prob * 100).toFixed(1)}%`;
  }