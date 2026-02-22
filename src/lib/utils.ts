import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Shadcn UI helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 1. PAYOUT UTILITIES
 */
export function getOddsMultiplier(odds: string | number | null | undefined): number {
  if (!odds) return 0;
  const oddsStr = String(odds).replace(/\+/g, '').trim();
  const numericOdds = parseFloat(oddsStr);
  if (isNaN(numericOdds) || numericOdds === 0) return 0;

  return numericOdds > 0 ? numericOdds / 100 : 100 / Math.abs(numericOdds);
}

export function calculateNetProfit(stake: number | string, odds: number | string): number {
  const s = Number(stake) || 0;
  const multiplier = getOddsMultiplier(odds);
  return parseFloat((s * multiplier).toFixed(2));
}

/**
 * 2. DATE UTILITIES
 */
export function formatBetDate(dateInput: any) {
  if (!dateInput) return "—"; // Fallback for missing dates
  
  const date = new Date(dateInput);
  
  // Check if the date object is valid
  if (isNaN(date.getTime())) {
    console.warn("Invalid date received:", dateInput);
    return "TBD"; 
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).format(date);
}
