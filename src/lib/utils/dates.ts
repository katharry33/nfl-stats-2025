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