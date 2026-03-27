export const COLUMNS_REGISTRY = [
  { id: 'week', label: 'Week', defaultVisible: true },
  { id: 'gameDate', label: 'Date', defaultVisible: true },
  { id: 'player', label: 'Player', defaultVisible: true },
  { id: 'matchup', label: 'Matchup', defaultVisible: true },
  { id: 'prop', label: 'Prop', defaultVisible: true },
  { id: 'line', label: 'Line', defaultVisible: true },

  // Enrichment fields
  { id: 'playerAvg', label: 'Avg', defaultVisible: true },
  { id: 'opponentRank', label: 'Opp Rank', defaultVisible: true },
  { id: 'opponentAvgVsStat', label: 'Opp Avg Vs', defaultVisible: true },
  { id: 'seasonHitPct', label: 'Hit %', defaultVisible: true },

  // Scoring engine fields
  { id: 'modelProb', label: 'Model %', defaultVisible: true },
  { id: 'expectedValue', label: 'EV', defaultVisible: true },
  { id: 'confidenceScore', label: 'Conf', defaultVisible: true },
  { id: 'bestEdge', label: 'Edge', defaultVisible: true },

  // Odds + O/U
  { id: 'overUnder', label: 'O/U', defaultVisible: true },
  { id: 'odds', label: 'Odds', defaultVisible: true },
] as const;

export type ColumnId = (typeof COLUMNS_REGISTRY)[number]['id'];
