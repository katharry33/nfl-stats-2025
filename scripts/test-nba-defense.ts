// scripts/test-nba-defense.ts
// Smoke test — verifies every TeamRankings NBA URL parses to 30 teams with valid avgs.
// Run with:  npx tsx scripts/test-nba-defense.ts
//
// No Firebase needed — purely checks the scraper against live TeamRankings pages.

// ── Inline the config so this file is self-contained ─────────────────────────

const CONFIG = [
    { propNorm: 'points',    url: 'https://www.teamrankings.com/nba/stat/opponent-points-per-game' },
    { propNorm: 'rebounds',  url: 'https://www.teamrankings.com/nba/stat/opponent-total-rebounds-per-game' },
    { propNorm: 'assists',   url: 'https://www.teamrankings.com/nba/stat/opponent-assists-per-game' },
    { propNorm: 'steals',    url: 'https://www.teamrankings.com/nba/stat/opponent-steals-per-game' },
    { propNorm: 'blocks',    url: 'https://www.teamrankings.com/nba/stat/opponent-blocks-per-game' },
    { propNorm: 'threes',    url: 'https://www.teamrankings.com/nba/stat/opponent-three-pointers-made-per-game' },
    { propNorm: 'turnovers', url: 'https://www.teamrankings.com/nba/stat/opponent-turnovers-per-game' },
  ];
  
  const NBA_TEAM_MAP: Record<string, string> = {
    'atlanta': 'ATL', 'atlanta hawks': 'ATL',
    'boston': 'BOS', 'boston celtics': 'BOS',
    'brooklyn': 'BKN', 'brooklyn nets': 'BKN',
    'charlotte': 'CHA', 'charlotte hornets': 'CHA',
    'chicago': 'CHI', 'chicago bulls': 'CHI',
    'cleveland': 'CLE', 'cleveland cavaliers': 'CLE',
    'dallas': 'DAL', 'dallas mavericks': 'DAL',
    'denver': 'DEN', 'denver nuggets': 'DEN',
    'detroit': 'DET', 'detroit pistons': 'DET',
    'golden state': 'GSW', 'golden state warriors': 'GSW', 'gs warriors': 'GSW',
    'houston': 'HOU', 'houston rockets': 'HOU',
    'indiana': 'IND', 'indiana pacers': 'IND',
    'la clippers': 'LAC', 'los angeles clippers': 'LAC',
    'la lakers': 'LAL', 'los angeles lakers': 'LAL',
    'memphis': 'MEM', 'memphis grizzlies': 'MEM',
    'miami': 'MIA', 'miami heat': 'MIA',
    'milwaukee': 'MIL', 'milwaukee bucks': 'MIL',
    'minnesota': 'MIN', 'minnesota timberwolves': 'MIN',
    'new orleans': 'NOP', 'new orleans pelicans': 'NOP',
    'new york': 'NYK', 'new york knicks': 'NYK', 'ny knicks': 'NYK',
    'oklahoma city': 'OKC', 'oklahoma city thunder': 'OKC', 'okla city': 'OKC',
    'orlando': 'ORL', 'orlando magic': 'ORL',
    'philadelphia': 'PHI', 'philadelphia 76ers': 'PHI',
    'phoenix': 'PHX', 'phoenix suns': 'PHX',
    'portland': 'POR', 'portland trail blazers': 'POR',
    'sacramento': 'SAC', 'sacramento kings': 'SAC',
    'san antonio': 'SAS', 'san antonio spurs': 'SAS',
    'toronto': 'TOR', 'toronto raptors': 'TOR',
    'utah': 'UTA', 'utah jazz': 'UTA',
    'washington': 'WAS', 'washington wizards': 'WAS',
  };
  
  function mapTeam(name: string): string | null {
    return NBA_TEAM_MAP[name.split('(')[0].trim().toLowerCase()] ?? null;
  }
  
  function parseTable(html: string): Record<string, { rank: number; avg: number }> {
    const result: Record<string, { rank: number; avg: number }> = {};
    const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) return result;
  
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    let rank = 0;
  
    while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
      const row = rowMatch[1];
      if (row.includes('<th') || !row.includes('<td')) continue;
      rank++;
  
      const teamMatch = row.match(/<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
      if (!teamMatch) continue;
  
      const abbr = mapTeam(teamMatch[1].trim());
      if (!abbr) { console.log(`  ⚠️  Unmapped: "${teamMatch[1].trim()}"`); continue; }
  
      const tds = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)];
      if (tds.length < 2) continue;
  
      const avg = parseFloat(tds[1][1].trim());
      if (!isNaN(avg)) result[abbr] = { rank, avg };
    }
  
    return result;
  }
  
  // ── Run ───────────────────────────────────────────────────────────────────────
  
  async function run() {
    console.log('\n🏀 NBA Defense — TeamRankings smoke test\n');
  
    const EXPECTED_TEAMS = 30;
    let allPassed = true;
  
    // A few key teams we always want to spot-check
    const SPOT_CHECKS: Record<string, string[]> = {
      points:    ['GSW', 'OKC', 'MEM'],
      rebounds:  ['BOS', 'DAL'],
      threes:    ['LAL', 'PHX'],
    };
  
    for (const { propNorm, url } of CONFIG) {
      process.stdout.write(`  ${propNorm.padEnd(12)}`);
  
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept':     'text/html',
            'Referer':    'https://www.teamrankings.com/nba/',
          },
        });
  
        if (!res.ok) {
          console.log(`❌  HTTP ${res.status}`);
          allPassed = false;
          await sleep(800);
          continue;
        }
  
        const html   = await res.text();
        const parsed = parseTable(html);
        const count  = Object.keys(parsed).length;
  
        if (count < EXPECTED_TEAMS) {
          console.log(`⚠️   Only ${count}/${EXPECTED_TEAMS} teams parsed`);
          allPassed = false;
        } else {
          // Spot check a few teams
          const checks = SPOT_CHECKS[propNorm] ?? [];
          const spotResults = checks.map(t => {
            const s = parsed[t];
            return s ? `${t}: ${s.avg} (#${s.rank})` : `${t}: MISSING`;
          });
  
          const preview = spotResults.length
            ? `  [${spotResults.join(', ')}]`
            : `  [#1: ${Object.entries(parsed).find(([,v]) => v.rank === 1)?.[0]} avg ${Object.entries(parsed).find(([,v]) => v.rank === 1)?.[1].avg}]`;
  
          console.log(`✅  ${count} teams${preview}`);
        }
      } catch (err) {
        console.log(`❌  ${err}`);
        allPassed = false;
      }
  
      await sleep(1200); // polite delay
    }
  
    console.log('\n' + (allPassed ? '✅  All checks passed' : '❌  Some checks failed — review output above'));
  
    // ── Combo lookup test ─────────────────────────────────────────────────────
    // Rebuild a mini defMap and verify combo resolution works
    console.log('\n── Combo lookup simulation ─────────────────────────────────────');
  
    const miniMap: Record<string, { rank: number; avg: number }> = {
      'points||OKC':   { rank: 3,  avg: 108.2 },
      'rebounds||OKC': { rank: 12, avg: 43.1  },
      'assists||OKC':  { rank: 7,  avg: 24.8  },
    };
  
    const combo = ['points', 'assists', 'rebounds'].map(c => miniMap[`${c}||OKC`]);
    const allFound = combo.every(Boolean);
  
    if (allFound) {
      const avg  = Math.round(combo.reduce((s, x) => s + x!.avg,  0) * 10) / 10;
      const rank = Math.ceil(combo.reduce((s, x) => s + x!.rank, 0) / combo.length);
      console.log(`  pts_ast_reb vs OKC → avg: ${avg}, rank: #${rank}  ✅`);
    } else {
      console.log('  Combo simulation failed — missing components');
    }
  
    console.log('');
  }
  
  function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  
  run().catch(console.error);