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
export function formatBetDate(dateInput: any): string {
  if (!dateInput) return "—";
  
  // Handle Firestore Timestamp { seconds, nanoseconds }
  const date = dateInput.seconds 
    ? new Date(dateInput.seconds * 1000) 
    : new Date(dateInput);

  if (isNaN(date.getTime())) return "Invalid Date";

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}
