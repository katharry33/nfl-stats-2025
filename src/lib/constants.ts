export const COLUMNS_REGISTRY = [
    { id: 'week', label: 'Week', defaultVisible: true },
    { id: 'gameDate', label: 'Date', defaultVisible: true },
    { id: 'player', label: 'Player', defaultVisible: true },
    { id: 'matchup', label: 'Matchup', defaultVisible: true },
    { id: 'prop', label: 'Prop', defaultVisible: true },
    { id: 'line', label: 'Line', defaultVisible: true },
    { id: 'playerAvg', label: 'Avg', defaultVisible: true },
    { id: 'opponentRank', label: 'Opp Rank', defaultVisible: true },
    { id: 'opponentAvgVsStat', label: 'Opp Avg Vs', defaultVisible: true },
    { id: 'scoreDiff', label: 'prop.scoreDiff', defaultVisible: true },
    { id: 'overUnder', label: 'O/U', defaultVisible: true },
    { id: 'seasonHitPct', label: 'Hit %', defaultVisible: true },
    { id: 'avgWinProb', label: 'Win Prob', defaultVisible: true },
    { id: 'bestEdgePct', label: 'Edge %', defaultVisible: true },
    { id: 'expectedValue', label: 'EV', defaultVisible: true },
    { id: 'confidenceScore', label: 'Conf', defaultVisible: true },
  ] as const;
  
  export type ColumnId = (typeof COLUMNS_REGISTRY)[number]['id'];