// lib/utils/normalize.ts
export function normalizePropData(id: string, data: any) {
    return {
      id: id || data.id,
      // Handle both "Player" and "player" from your JSON
      player: data.player || data.Player || "Unknown Player",
      team: data.team || data.Team || "N/A",
      prop: data.prop || data.Prop || "Unknown Prop",
      line: Number(data.line ?? data.Line ?? 0),
      odds: typeof data.odds === 'string' ? data.odds : (data.odds || data.Odds || 0),
      week: Number(data.week ?? data.Week ?? 0),
      matchup: data.matchup || data.Matchup || "",
      gameDate: data.gameDate || data.GameDate || "",
      // Default values for our BetLeg interface requirements
      status: 'pending',
      selection: 'Over',
      source: 'api'
    };
  }