// ---------------------------------------------------------------------------
// NBA PROP NORMALIZATION
// Canonical prop names use lowercase words ("points", "rebounds", "threes").
// ---------------------------------------------------------------------------

const NBA_PROP_ALIASES: Record<string, string> = {
  // Base stats
  'point': 'points', 'pts': 'points',
  'assist': 'assists', 'ast': 'assists',
  'rebound': 'rebounds', 'reb': 'rebounds', 'trb': 'rebounds',
  'steal': 'steals', 'stl': 'steals',
  'block': 'blocks', 'blk': 'blocks',
  '3pm': 'threes', '3s': 'threes', 'fg3': 'threes', 'three': 'threes',
  'turnover': 'turnovers', 'tov': 'turnovers',

  // Combos
  'pra': 'pts_ast_reb',
  'pts+ast': 'pts_ast',
  'pts+reb': 'pts_reb',
  'ast+reb': 'ast_reb',
  'pts+ast+reb': 'pts_ast_reb',
  'stl+blk': 'stl_blk'
};

export function normalizeNBAProp(raw: string): string {
  if (!raw) return '';

  let lower = raw.toLowerCase().trim();

  // Normalize separators: +, -, /, spaces → underscore
  lower = lower
    .replace(/[\s]*\+[\s]*/g, '_')
    .replace(/[\s]*\/[\s]*/g, '_')
    .replace(/[\s]*-[\s]*/g, '_')
    .replace(/\s+/g, '_');

  // Direct alias match
  if (NBA_PROP_ALIASES[lower]) return NBA_PROP_ALIASES[lower];

  return lower;
}

// ---------------------------------------------------------------------------
// Combo splitting
// ---------------------------------------------------------------------------

const BASE_NBA_PROPS = new Set([
  'points', 'assists', 'rebounds', 'steals', 'blocks', 'threes', 'turnovers',
  'pts', 'ast', 'reb', 'stl', 'blk', 'tov'
]);

export function splitNBACombo(propNorm: string): string[] | null {
  if (BASE_NBA_PROPS.has(propNorm)) return null;

  for (const sep of ['+', '_and_', '_']) {
    if (!propNorm.includes(sep)) continue;
    const parts = propNorm.split(sep).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;
  }

  return null;
}
