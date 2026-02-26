import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 1. Core UI Helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 2. Direct Logic (If you want them here)
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

export function formatBetDate(dateInput: any) {
  if (!dateInput) return "—";
  const date = (dateInput?.toDate && typeof dateInput.toDate === 'function') 
    ? dateInput.toDate() 
    : new Date(dateInput);
  
  if (isNaN(date.getTime())) return "TBD"; 

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).format(date);
}

// 3. Re-exports (Only if these files exist separately)
// export * from './utils/payout'; 
// export * from './utils/nfl-week';