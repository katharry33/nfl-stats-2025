// lib/enrichment/nba/statMapper.ts

export const NBA_PROP_MAP: Record<string, string[]> = {
    'Pts': ['pts'],
    'Reb': ['trb'], // BBRef uses 'trb' for Total Rebounds
    'Ast': ['ast'],
    'Stl': ['stl'],
    'Blk': ['blk'],
    '3pt': ['fg3'],
    'TO': ['tov'],
    // Combined Props
    'Pts+Reb+Ast': ['pts', 'trb', 'ast'],
    'Pts+Reb': ['pts', 'trb'],
    'Pts+Ast': ['pts', 'ast'],
    'Reb+Ast': ['pts', 'ast'],
    'Stl+Blk': ['stl', 'blk'],
  };
  
  export function calculateStatFromFields(statsDoc: any, propType: string): number {
    const fields = NBA_PROP_MAP[propType];
    if (!fields) return 0;
    
    // Sum up all fields (e.g., if prop is Pts+Reb, it sums doc.pts + doc.trb)
    return fields.reduce((sum, field) => sum + (Number(statsDoc[field]) || 0), 0);
  }