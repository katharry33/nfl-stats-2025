/**
 * Determines the current NFL season based on the current date.
 * The NFL season typically starts in September and ends in February of the following year.
 * @returns The current NFL season year (e.g., 2024 for the 2024-2025 season).
 */
export const getCurrentNflSeason = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = January, 11 = December

  // If the month is September or later, the season is the current year.
  // If it's before September, it's still considered part of the previous year's season.
  return month >= 8 ? year : year - 1;
};

/**
 * Determines the current NBA season based on the current date.
 * The NBA season typically starts in October and ends in June of the following year.
 * @returns The current NBA season year (e.g., 2025 for the 2025-2026 season).
 */
export const getCurrentNbaSeason = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = January, 11 = December

  // If the month is October or later, the season is the *next* year's designation (e.g., Oct 2025 is part of 2026 season).
  // If it's before October, it's part of the current year's designation (e.g., Jan 2026 is part of 2026 season).
  return month >= 9 ? year + 1 : year;
};
