import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 1. Core UI Helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts -110 to 1.91 or +150 to 2.50
export function toDecimal(american: number): number {
  if (american >= 100) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

// Converts 3.50 back to +250
export function toAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
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