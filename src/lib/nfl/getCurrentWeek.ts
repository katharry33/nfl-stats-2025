// src/lib/nfl/getCurrentWeek.ts

const SEASON_START_DATES: Record<number, string> = {
    2024: '2024-09-05',
    2025: '2025-09-04',
    2026: '2026-09-10',
  };
  
  /**
   * Returns the current NFL week (1–18) based on the season's kickoff Thursday.
   * Used server-side in API routes and page server components.
   */
  export function getCurrentNFLWeek(season = 2025): number {
    const startStr = SEASON_START_DATES[season] ?? SEASON_START_DATES[2025];
    const startDate = new Date(startStr);
    const now = new Date();
  
    const diffMs   = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week     = Math.floor(diffDays / 7) + 1;
  
    // Clamp to valid regular-season range
    return Math.min(Math.max(week, 1), 18);
  }