import { DefenseMap } from '@/lib/types';
import { fetchHtmlTable } from '@/lib/enrichment/shared/fetchHtmlTable';

// NBA defensive stats we care about
const NBA_DEF_STATS = {
  points:  'Points Per Game',
  rebounds: 'Rebounds Per Game',
  assists: 'Assists Per Game',
  steals: 'Steals Per Game',
  blocks: 'Blocks Per Game',
  threes: '3-Point Field Goals Made',
  turnovers: 'Turnovers Per Game',
} as const;

export type NbaDefStat = keyof typeof NBA_DEF_STATS;

/**
 * Fetch all NBA defense stats from TeamRankings and return a flat DefenseMap:
 * 
 *   key: `${stat}||${team}`
 *   value: { rank, avg }
 */
export async function fetchNbaDefenseStats(): Promise<DefenseMap> {
  const defMap: DefenseMap = {};

  for (const stat of Object.keys(NBA_DEF_STATS) as NbaDefStat[]) {
    const label = NBA_DEF_STATS[stat];

    const rows = await fetchHtmlTable(
      `https://www.teamrankings.com/nba/stat/${stat}`
    );

    for (const row of rows) {
      const team = row['Team']?.toUpperCase();
      const rank = Number(row['Rank']);
      const avg  = Number(row[label]);

      if (!team || Number.isNaN(rank) || Number.isNaN(avg)) continue;

      const key = `${stat}||${team}`;
      defMap[key] = { rank, avg };
    }
  }

  return defMap;
}

/**
 * Lookup a single stat/team pair.
 */
export function lookupNbaDefense(
  defMap: DefenseMap,
  stat: string,
  team: string
): { rank: number; avg: number } | null {
  const key = `${stat}||${team.toUpperCase()}`;
  return defMap[key] ?? null;
}
