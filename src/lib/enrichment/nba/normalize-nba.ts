// src/lib/shared/normalize-nba.ts
// NBA equivalent of the NFL normalize helpers.
// Canonical prop names use simple lowercase words ("points", "rebounds", "threes").

// ---------------------------------------------------------------------------
// Aliases → canonical prop name
// ---------------------------------------------------------------------------

const NBA_PROP_ALIASES: Record<string, string> = {
    // Points
    'point':                    'points',
    'pts':                      'points',
  
    // Assists
    'assist':                   'assists',
    'ast':                      'assists',
  
    // Rebounds
    'rebound':                  'rebounds',
    'reb':                      'rebounds',
    'trb':                      'rebounds',
    'total rebounds':           'rebounds',
    'total rebound':            'rebounds',
  
    // Steals
    'steal':                    'steals',
    'stl':                      'steals',
  
    // Blocks
    'block':                    'blocks',
    'blk':                      'blocks',
  
    // 3-pointers made
    '3pm':                      'threes',
    '3s':                       'threes',
    'fg3':                      'threes',
    'three':                    'threes',
    'three pointers made':      'threes',
    '3 pointers made':          'threes',
    '3-pointers made':          'threes',
    'threes made':              'threes',
  
    // Turnovers
    'turnover':                 'turnovers',
    'tov':                      'turnovers',
    'to':                       'turnovers',
  
    // ── Common combo prop labels used by sportsbooks ─────────────────────────
    'pts+ast':                  'pts_ast',
    'points+assists':           'pts_ast',
    'points + assists':         'pts_ast',
  
    'pts+reb':                  'pts_reb',
    'points+rebounds':          'pts_reb',
    'points + rebounds':        'pts_reb',
  
    'ast+reb':                  'ast_reb',
    'assists+rebounds':         'ast_reb',
    'assists + rebounds':       'ast_reb',
  
    'pts+ast+reb':              'pts_ast_reb',
    'points+assists+rebounds':  'pts_ast_reb',
    'points + assists + rebounds': 'pts_ast_reb',
    'pra':                      'pts_ast_reb',
  
    'stl+blk':                  'stl_blk',
    'steals+blocks':            'stl_blk',
    'steals + blocks':          'stl_blk',
  
    'pts+ast+reb+stl+blk':      'pts_ast_reb_stl_blk',
  };
  
  export function normalizeNBAProp(raw: string): string {
    const lower = raw.toLowerCase().trim();
    return NBA_PROP_ALIASES[lower] ?? lower;
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