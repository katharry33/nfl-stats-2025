/**
 * Generates a likely Basketball-Reference ID from a player's name.
 * Example: "LeBron James" -> "jamesle01"
 */
export function generateNBABrId(playerName: string): string {
  const parts = playerName.toLowerCase().split(' ');
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const firstName = parts[0];

  const ln = lastName.slice(0, 5);
  const fn = firstName.slice(0, 2);
  
  return `${ln}${fn}01`; 
}

/**
 * A simple sleep utility.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
