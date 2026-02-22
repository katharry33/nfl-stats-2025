// src/lib/utils/dates.ts

type FirestoreTimestamp = { seconds: number; nanoseconds?: number };
type AnyDate = FirestoreTimestamp | Date | string | number | null | undefined;

export function resolveDate(value: AnyDate): Date | null {
  if (value == null) return null;

  // Firestore Timestamp { seconds, nanoseconds }
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
    const s = value.trim();

    // Pure YYYY-MM-DD from <input type="date"> — parse as LOCAL noon to avoid UTC rollback
    // e.g. "2026-02-08" in ET would become Feb 7 UTC if parsed normally
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // local noon — never crosses day boundary
    }

    // Firestore "January 18, 2026 at 7:00:00 AM UTC-5" — strip the "at"
    const cleaned = s.replace(' at ', ' ');
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Priority: gameDate → manualDate → date (DK/Legacy string) → createdAt → legs[0].gameDate
 * Purposely puts `date` before `createdAt` for legacy bets where `date` is the actual game date.
 */
export function formatBetDate(bet: any): string {
  const date =
    resolveDate(bet?.gameDate) ??
    resolveDate(bet?.manualDate) ??
    resolveDate(bet?.date) ??
    resolveDate(bet?.createdAt) ??
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

/** YYYY-MM-DD for <input type="date"> using LOCAL date parts — no UTC shift. */
export function toDateInputValue(value: AnyDate): string {
  const date = resolveDate(value);
  if (!date) return new Date().toISOString().split('T')[0];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ms epoch for sort comparisons */
export function resolveDateMs(value: AnyDate): number {
  return resolveDate(value)?.getTime() ?? 0;
}


const WEEK_STARTS: Record<number, Date> = {
  1:  new Date('2025-09-04T00:00:00Z'),
  2:  new Date('2025-09-11T00:00:00Z'),
  3:  new Date('2025-09-18T00:00:00Z'),
  4:  new Date('2025-09-25T00:00:00Z'),
  5:  new Date('2025-10-02T00:00:00Z'),
  6:  new Date('2025-10-09T00:00:00Z'),
  7:  new Date('2025-10-16T00:00:00Z'),
  8:  new Date('2025-10-23T00:00:00Z'),
  9:  new Date('2025-10-30T00:00:00Z'),
  10: new Date('2025-11-06T00:00:00Z'),
  11: new Date('2025-11-13T00:00:00Z'),
  12: new Date('2025-11-20T00:00:00Z'),
  13: new Date('2025-11-27T00:00:00Z'),
  14: new Date('2025-12-04T00:00:00Z'),
  15: new Date('2025-12-11T00:00:00Z'),
  16: new Date('2025-12-18T00:00:00Z'),
  17: new Date('2025-12-25T00:00:00Z'),
  18: new Date('2026-01-01T00:00:00Z'),
  19: new Date('2026-01-08T00:00:00Z'),
  20: new Date('2026-01-15T00:00:00Z'),
  21: new Date('2026-01-22T00:00:00Z'),
  22: new Date('2026-02-05T00:00:00Z'),
};

export function getCurrentNFLWeek(): number {
  const now = new Date();
  let current = 1;
  for (const [week, start] of Object.entries(WEEK_STARTS)) {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    if (now >= start && now < end) return parseInt(week);
    if (now >= start) current = parseInt(week);
  }
  return current;
}