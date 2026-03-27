// src/lib/enrichment/nba/utils.ts

/**
 * Generates a *likely* Basketball-Reference ID from a player's name.
 * 
 * This is a fallback only — BR IDs are not perfectly predictable.
 * If the generated ID fails, enrichment should mark the prop as
 * needsReview: true so you can manually correct the BR ID.
 */
export function generateNBABrId(playerName: string): string {
  if (!playerName) return '';

  const parts = playerName.toLowerCase().split(' ');
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  const ln = lastName.slice(0, 5);
  const fn = firstName.slice(0, 2);

  return `${ln}${fn}01`;
}

/**
 * Simple async sleep utility.
 * Useful for rate limiting or retry loops.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
