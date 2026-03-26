const SEASON_START_DATES: Record<number, string> = {
    2024: '2024-09-05',
    2025: '2025-09-04',
    2026: '2026-09-10',
  };
  
  export function getCurrentNFLWeek(season = 2025): number {
    const startStr = SEASON_START_DATES[season] ?? SEASON_START_DATES[2025];
    const startDate = new Date(startStr);
    const now = new Date();
  
    if (now < startDate) return 1; // Pre-season / Week 1 placeholder
  
    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
  
    return Math.min(Math.max(week, 1), 18);
  }