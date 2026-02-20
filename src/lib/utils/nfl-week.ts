// src/lib/utils/nfl-week.ts
// Derives NFL week number from any date value
// Used for DK/Legacy bets that have no week field

import { resolveDate } from './dates';

// 2025 NFL season week start dates (Thursday of each week, UTC)
const WEEK_STARTS_2025: [number, Date][] = [
  [1,  new Date('2025-09-04T00:00:00Z')],
  [2,  new Date('2025-09-11T00:00:00Z')],
  [3,  new Date('2025-09-18T00:00:00Z')],
  [4,  new Date('2025-09-25T00:00:00Z')],
  [5,  new Date('2025-10-02T00:00:00Z')],
  [6,  new Date('2025-10-09T00:00:00Z')],
  [7,  new Date('2025-10-16T00:00:00Z')],
  [8,  new Date('2025-10-23T00:00:00Z')],
  [9,  new Date('2025-10-30T00:00:00Z')],
  [10, new Date('2025-11-06T00:00:00Z')],
  [11, new Date('2025-11-13T00:00:00Z')],
  [12, new Date('2025-11-20T00:00:00Z')],
  [13, new Date('2025-11-27T00:00:00Z')],
  [14, new Date('2025-12-04T00:00:00Z')],
  [15, new Date('2025-12-11T00:00:00Z')],
  [16, new Date('2025-12-18T00:00:00Z')],
  [17, new Date('2025-12-25T00:00:00Z')],
  [18, new Date('2026-01-01T00:00:00Z')],
  [19, new Date('2026-01-08T00:00:00Z')], // Wild Card
  [20, new Date('2026-01-15T00:00:00Z')], // Divisional
  [21, new Date('2026-01-22T00:00:00Z')], // Conference
  [22, new Date('2026-02-05T00:00:00Z')], // Super Bowl
];

// 2024 season fallback
const WEEK_STARTS_2024: [number, Date][] = [
  [1,  new Date('2024-09-05T00:00:00Z')],
  [2,  new Date('2024-09-12T00:00:00Z')],
  [3,  new Date('2024-09-19T00:00:00Z')],
  [4,  new Date('2024-09-26T00:00:00Z')],
  [5,  new Date('2024-10-03T00:00:00Z')],
  [6,  new Date('2024-10-10T00:00:00Z')],
  [7,  new Date('2024-10-17T00:00:00Z')],
  [8,  new Date('2024-10-24T00:00:00Z')],
  [9,  new Date('2024-10-31T00:00:00Z')],
  [10, new Date('2024-11-07T00:00:00Z')],
  [11, new Date('2024-11-14T00:00:00Z')],
  [12, new Date('2024-11-21T00:00:00Z')],
  [13, new Date('2024-11-28T00:00:00Z')],
  [14, new Date('2024-12-05T00:00:00Z')],
  [15, new Date('2024-12-12T00:00:00Z')],
  [16, new Date('2024-12-19T00:00:00Z')],
  [17, new Date('2024-12-26T00:00:00Z')],
  [18, new Date('2025-01-02T00:00:00Z')],
  [19, new Date('2025-01-11T00:00:00Z')],
  [20, new Date('2025-01-18T00:00:00Z')],
  [21, new Date('2025-01-26T00:00:00Z')],
  [22, new Date('2026-02-09T00:00:00Z')],
];

/**
 * Derives the NFL week number from any date value.
 * Returns null if the date doesn't fall within any NFL week range.
 */
export function getWeekFromDate(value: any): number | null {
  const date = resolveDate(value);
  if (!date) return null;

  // Pick the right season's table based on year
  const year = date.getFullYear();
  const table = year >= 2025 ? WEEK_STARTS_2025 : WEEK_STARTS_2024;

  let matchedWeek: number | null = null;

  for (let i = 0; i < table.length; i++) {
    const [week, start] = table[i];
    const end = i + 1 < table.length ? table[i + 1][1] : new Date(start.getTime() + 7 * 86400000);

    if (date >= start && date < end) {
      matchedWeek = week;
      break;
    }
  }

  return matchedWeek;
}

/**
 * Parses a line string that may contain Over/Under prefix.
 * "Under 250.5" → { selection: "Under", line: 250.5 }
 * "Over 45.5"   → { selection: "Over", line: 45.5 }
 * "250.5"       → { selection: null, line: 250.5 }
 */
export function parseLineField(raw: string | number | undefined | null): {
  selection: 'Over' | 'Under' | null;
  line: number;
} {
  if (raw == null) return { selection: null, line: 0 };

  if (typeof raw === 'number') return { selection: null, line: raw };

  const str = String(raw).trim();

  // "Over 250.5" or "Under 32.5 Live"
  const match = str.match(/^(over|under)\s+([\d.]+)/i);
  if (match) {
    return {
      selection: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() as 'Over' | 'Under',
      line: parseFloat(match[2]),
    };
  }

  const num = parseFloat(str);
  return { selection: null, line: isNaN(num) ? 0 : num };
}