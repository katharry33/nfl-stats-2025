import * as NFLEngine from '../nfl/pfr';
import * as NBAEngine from '../nba/engine';

export async function getSportEngine(sport: 'nfl' | 'nba') {
  return sport === 'nba' ? NBAEngine : NFLEngine;
}