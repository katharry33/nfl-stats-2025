// src/lib/utils/dates.ts

type FirestoreTimestamp = { seconds: number; nanoseconds?: number };
type AnyDate = FirestoreTimestamp | Date | string | number | null | undefined;

export function resolveDate(value: AnyDate): Date | null {
  if (value == null) return null;

  // Firestore Timestamp shape { seconds, nanoseconds }
  if (typeof value === 'object' && !(value instanceof Date) && 'seconds' in value) {
    return new Date((value as FirestoreTimestamp).seconds * 1000);
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    // Strip Firestore's "at" connector: "January 18, 2026 at 7:00:00 AM UTC-5"
    const cleaned = value.replace(' at ', ' ');
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Picks the best available date from a bet doc and formats it for display.
 * Priority: gameDate → manualDate → createdAt (app bets) → date (DK string)
 * Returns "—" if nothing resolves.
 */
export function formatBetDate(bet: any): string {
  const date =
    resolveDate(bet?.gameDate) ??
    resolveDate(bet?.manualDate) ??
    resolveDate(bet?.createdAt) ??
    resolveDate(bet?.date) ??
    resolveDate(bet?.legs?.[0]?.gameDate) ??
    null;

  if (!date) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

/**
 * Returns YYYY-MM-DD string for <input type="date"> — avoids timezone shifts.
 */
export function toDateInputValue(value: AnyDate): string {
  const date = resolveDate(value);
  if (!date) return new Date().toISOString().split('T')[0];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns ms epoch from any date value — useful for sorting.
 */
export function resolveDateMs(value: AnyDate): number {
  return resolveDate(value)?.getTime() ?? 0;
}