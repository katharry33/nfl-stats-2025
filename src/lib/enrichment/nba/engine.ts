import { BalldontlieAPI } from "@balldontlie/sdk";

// 1. Initialize the API instance at the top level
const api = new BalldontlieAPI({ 
  apiKey: process.env.BDL_API_KEY || '' 
});

const STAT_MAP: Record<string, string> = {
  'pts': 'pts',
  'reb': 'reb',
  'ast': 'ast',
  '3pm': 'fg3m',
  'stl': 'stl',
  'blk': 'blk'
};

export async function fetchNBALogs(playerName: string, season: number) {
  // Now 'api' is defined in the outer scope, so it works here
  const players = await api.nba.getPlayers({ search: playerName });
  if (!players.data || players.data.length === 0) return [];
  
  const playerId = players.data[0].id;

  const stats = await api.nba.getStats({ 
    player_ids: [playerId], 
    seasons: [season],
    per_page: 100 
  });

  return stats.data;
}

export function getNBAStat(game: any, propNorm: string): number | null {
  if (propNorm.includes('+')) {
    const parts = propNorm.split('+');
    return parts.reduce((sum, part) => sum + (game[STAT_MAP[part]] || 0), 0);
  }
  return game[STAT_MAP[propNorm]] ?? null;
}