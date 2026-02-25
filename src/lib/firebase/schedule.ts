
// src/lib/firebase/schedule.ts
// ScheduleEntry is defined here since it's specific to schedule data.

export interface ScheduleEntry {
  id?:          string;
  week:         number;
  season?:      number;
  gameDate?:    string;
  homeTeam:     string;
  awayTeam:     string;
  matchup?:     string;
  gameTime?:    string;
  stadium?:     string;
  broadcast?:   string;
  [key: string]: any;
}

// Re-export so any file that imports ScheduleEntry from here keeps working
export type { ScheduleEntry as default };
