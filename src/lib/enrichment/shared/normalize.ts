// src/lib/shared/normalize.ts

/**
 * Standardizes player names to prevent "A.J. Brown" vs "AJ Brown" mismatches.
 * Used for both searching and Firestore key generation.
 */
export function normalizePlayerName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[.'’]/g, '') // Remove dots and apostrophes
    .replace(/\s+/g, ' ')  // Collapse double spaces
    .trim();
}

/**
 * Universal hydrator to convert raw Firestore/CSV data into a typed PropData object.
 */
export function hydrateProp(data: any, id: string) {
  const get = (keys: string[]) => {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") return data[key];
    }
    return undefined;
  };

  const num = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const league = (get(['league', 'League']) || 'nfl').toLowerCase();

  return {
    id,
    player: get(['player', 'Player', 'name']) || 'Unknown Player',
    team: get(['team', 'Team', 'logo']),
    league: league as 'nba' | 'nfl',
    prop: get(['prop', 'Prop', 'market']) || '',
    line: num(get(['line', 'Line'])),
    overUnder: get(['overUnder', 'overunder', 'selection', 'Over/Under?']) || 'Over',
    matchup: get(['matchup', 'Matchup']) || '',
    week: get(['week']) ? num(get(['week'])) : null,
    gameDate: get(['gameDate', 'gamedate', 'Date']) || null,
    season: get(['season']) ? num(get(['season'])) : null,
    // Analytics
    playerAvg: num(get(['playerAvg', 'avg'])),
    bestEdgePct: num(get(['bestEdgePct', 'edge'])),
    expectedValue: num(get(['expectedValue', 'ev'])),
    confidenceScore: num(get(['confidenceScore', 'conf'])),
    odds: num(get(['odds', 'fdOdds'])),
    actualResult: get(['actualResult', 'result']) || 'Pending',
    updatedAt: get(['updatedAt', 'lastUpdated']) || new Date().toISOString(),
  };
}

export function getOpponent(team: string, matchup: string): string | null {
  if (!matchup || !team) return null;
  const parts = matchup.split(/[@vV]/).map(p => p.trim());
  if (parts.length !== 2) return null;
  return parts[0].toLowerCase() === team.toLowerCase() ? parts[1] : parts[0];
}

export function splitComboProp(prop: string): string[] | null {
  if (!prop || !prop.includes('+')) return null;
  return prop.split('+').map(p => p.trim().toLowerCase());
}