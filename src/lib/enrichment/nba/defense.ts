import type { DefenseMap } from '@/lib/types';

const NBA_TEAMRANKINGS_CONFIG = [
  { propNorm: 'points', url: 'https://www.teamrankings.com/nba/stat/opponent-points-per-game' },
  { propNorm: 'rebounds', url: 'https://www.teamrankings.com/nba/stat/opponent-total-rebounds-per-game' },
  { propNorm: 'assists', url: 'https://www.teamrankings.com/nba/stat/opponent-assists-per-game' },
  { propNorm: 'steals', url: 'https://www.teamrankings.com/nba/stat/opponent-steals-per-game' },
  { propNorm: 'blocks', url: 'https://www.teamrankings.com/nba/stat/opponent-blocks-per-game' },
  { propNorm: 'threes', url: 'https://www.teamrankings.com/nba/stat/opponent-three-pointers-made-per-game' },
  { propNorm: 'turnovers', url: 'https://www.teamrankings.com/nba/stat/opponent-turnovers-per-game' },
] as const;

export async function fetchAllNBADefenseStats(season: number): Promise<DefenseMap> {
  const defMap: DefenseMap = {};

  for (const config of NBA_TEAMRANKINGS_CONFIG) {
    try {
      const res = await fetch(config.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const parsed = parseTeamRankingsTable(html);

      for (const [teamAbbr, stats] of Object.entries(parsed)) {
        if (!defMap[teamAbbr]) defMap[teamAbbr] = {};
        defMap[teamAbbr][config.propNorm] = stats;
      }
      await new Promise(r => setTimeout(r, 600));
    } catch (e) { console.error(e); }
  }
  return defMap;
}

function parseTeamRankingsTable(html: string): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  let rank = 0;

  for (const row of rows) {
    if (row.includes('<th') || !row.includes('<td')) continue;
    rank++;
    const teamMatch = row.match(/<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    const tdMatches = [...row.matchAll(/<td[^>]*>([\d.]+)<\/td>/gi)];
    const avgVal = tdMatches[0]?.[1] || "0";

    if (teamMatch) {
      const teamAbbr = mapNBATeamName(teamMatch[1].trim());
      if (teamAbbr) result[teamAbbr] = { rank, avg: parseFloat(avgVal) };
    }
  }
  return result;
}

export function lookupNBADefenseStats(defMap: DefenseMap, propNorm: string, opponent: string) {
  const teamData = defMap[opponent.toUpperCase()];
  if (!teamData) return null;
  return teamData[propNorm] || null;
}

function mapNBATeamName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('atlanta')) return 'ATL';
  if (n.includes('boston')) return 'BOS';
  if (n.includes('brooklyn')) return 'BKN';
  if (n.includes('charlotte')) return 'CHA';
  if (n.includes('chicago')) return 'CHI';
  if (n.includes('cleveland')) return 'CLE';
  if (n.includes('dallas')) return 'DAL';
  if (n.includes('denver')) return 'DEN';
  if (n.includes('detroit')) return 'DET';
  if (n.includes('golden state') || n.includes('gs warriors')) return 'GSW';
  if (n.includes('houston')) return 'HOU';
  if (n.includes('indiana')) return 'IND';
  if (n.includes('la clippers')) return 'LAC';
  if (n.includes('la lakers')) return 'LAL';
  if (n.includes('memphis')) return 'MEM';
  if (n.includes('miami')) return 'MIA';
  if (n.includes('milwaukee')) return 'MIL';
  if (n.includes('minnesota')) return 'MIN';
  if (n.includes('new orleans')) return 'NOP';
  if (n.includes('new york')) return 'NYK';
  if (n.includes('okla city') || n.includes('oklahoma city')) return 'OKC';
  if (n.includes('orlando')) return 'ORL';
  if (n.includes('philadelphia')) return 'PHI';
  if (n.includes('phoenix')) return 'PHX';
  if (n.includes('portland')) return 'POR';
  if (n.includes('sacramento')) return 'SAC';
  if (n.includes('san antonio')) return 'SAS';
  if (n.includes('toronto')) return 'TOR';
  if (n.includes('utah')) return 'UTA';
  if (n.includes('washington')) return 'WAS';
  return null;
}