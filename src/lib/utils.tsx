// src/lib/utils.ts
// -----------------------------------------------------------------------------
//  SHARED UI + FORMAT HELPERS (CLEANED + MODERNIZED)
// -----------------------------------------------------------------------------

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// -----------------------------------------------------------------------------
// CLASSNAME MERGE
// -----------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------------------------------
// FORMATTING HELPERS
// -----------------------------------------------------------------------------

/**
 * Format a number to 1 decimal place.
 * Used for playerAvg, opponentAvgVsStat, etc.
 */
export const fmt = (val: any) => {
  if (val == null || isNaN(val)) return "—";
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

/**
 * Format a probability or decimal into a percentage.
 * Accepts:
 *   - modelProb (0–1)
 *   - expectedValue (decimal)
 *   - bestEdge (decimal)
 */
export const fmtPct = (val: any) => {
  if (val == null || isNaN(val)) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `${Math.round(num * 100)}%`;
};

/**
 * Format a YYYY-MM-DD date into "Mar 12".
 */
export const formatBetDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format Firestore timestamps or ISO strings.
 */
export function formatTimestamp(date: string | Date | any) {
  if (!date) return "—";
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
