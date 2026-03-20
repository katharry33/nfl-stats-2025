import { BalldontlieAPI } from "@balldontlie/sdk";

const apiKey = process.env.BDL_API_KEY;

if (!apiKey) {
  throw new Error("Missing BDL_API_KEY environment variable");
}

// Initialize the SDK instance
export const bdl = new BalldontlieAPI({ apiKey });

/**
 * Maps your internal prop keys to the field names 
 * returned by Balldontlie's Stats API.
 */
const STAT_MAP: Record<string, string> = {
  'pts': 'pts',
  'reb': 'reb',
  'ast': 'ast',
  '3pm': 'fg3m', // Three Pointers Made
  'stl': 'stl',
  'blk': 'blk',
  'to':  'turnover',
  'min': 'min'
};

export async function fetchNBALogs(playerName: string, season: number) {
  try {
    // 1. Search for the player using the NBA namespace
    const players = await bdl.nba.getPlayers({ search: playerName });
    
    if (!players.data || players.data.length === 0) {
      console.warn(`No NBA player found for: ${playerName}`);
      return [];
    }
    
    const playerId = players.data[0].id;

    // 2. Fetch stats for the player for the specific season
    // Using the NBA namespace ensures we hit the correct versioned endpoint
    const stats = await bdl.nba.getStats({ 
      player_ids: [playerId], 
      seasons: [season],
      per_page: 100 
    });

    return stats.data || [];
  } catch (error) {
    console.error("Error fetching NBA logs:", error);
    return [];
  }
}

/**
 * Calculates the stat value from a game log, 
 * supporting combo props like 'pts+reb+ast'.
 */
export function getNBAStat(game: any, propNorm: string): number | null {
  if (!game) return null;

  // Handle combo props (e.g., "pts+reb")
  if (propNorm.includes('+')) {
    const parts = propNorm.split('+');
    return parts.reduce((sum, part) => {
      const field = STAT_MAP[part.trim()];
      return sum + (Number(game[field]) || 0);
    }, 0);
  }

  // Handle single props
  const field = STAT_MAP[propNorm.trim()];
  const value = game[field];
  
  return value !== undefined ? Number(value) : null;
}