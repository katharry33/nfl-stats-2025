// src/lib/shared/normalize-nba.ts
// NBA equivalent of the NFL normalize helpers.
// Canonical prop names use simple lowercase words ("points", "rebounds", "threes").

// ---------------------------------------------------------------------------
// Aliases → canonical prop name
// ---------------------------------------------------------------------------

const NBA_PROP_ALIASES: Record<string, string> = {
  'point': 'points', 'pts': 'points',
  'assist': 'assists', 'ast': 'assists',
  'rebound': 'rebounds', 'reb': 'rebounds', 'trb': 'rebounds',
  'steal': 'steals', 'stl': 'steals',
  'block': 'blocks', 'blk': 'blocks',
  '3pm': 'threes', '3s': 'threes', 'fg3': 'threes', 'three': 'threes',
  'turnover': 'turnovers', 'tov': 'turnovers',
  'pra': 'pts_ast_reb',
  'pts+ast': 'pts_ast', 'pts+reb': 'pts_reb', 'ast+reb': 'ast_reb',
  'pts+ast+reb': 'pts_ast_reb', 'stl+blk': 'stl_blk'
};

export function normalizeNBAProp(raw: string): string {
  const lower = raw.toLowerCase().trim();
  // Check direct alias
  if (NBA_PROP_ALIASES[lower]) return NBA_PROP_ALIASES[lower];
  // Handle space/plus variations (e.g., "Points + Assists")
  const normalized = lower.replace(/\s*\+\s*/g, '_').replace(/\s+/g, '_');
  return NBA_PROP_ALIASES[normalized] ?? normalized;
}

  // ---------------------------------------------------------------------------
  // Combo splitting
  // ---------------------------------------------------------------------------
  // Recognises prop strings joined by "+", "_", or "_and_".
  // Returns null when there are no combo components (i.e. it's a base stat).
  
  const BASE_NBA_PROPS = new Set([
    'points', 'assists', 'rebounds', 'steals', 'blocks', 'threes', 'turnovers',
    // keep underscore aliases too
    'pts', 'ast', 'reb', 'stl', 'blk', 'tov',
  ]);
  
  export function splitNBACombo(propNorm: string): string[] | null {
    // Already a known base stat — don't try to split it
    if (BASE_NBA_PROPS.has(propNorm)) return null;
  
    // Try "+", then "_and_", then "_" as separators
    for (const sep of ['+', '_and_', '_']) {
      if (!propNorm.includes(sep)) continue;
      const parts = propNorm.split(sep).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.every(p => p.length > 0)) return parts;
    }
  
    return null;
  }