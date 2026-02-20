// src/hooks/useCurrentWeek.ts
'use client';

import { useState, useEffect } from 'react';

// Mirror of Apps Script getWeekDateRange
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

export function useCurrentWeek() {
  const [week, setWeek] = useState<number>(getCurrentNFLWeek);
  return { week, setWeek };
}