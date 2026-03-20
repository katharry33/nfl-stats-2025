'use client';
import React, { useState } from 'react';

const LEAGUES = [
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'ncaab', label: 'NCAAB', icon: '🎓' }
];

const MARKET_MAP: { [key: string]: string[] } = {
  nba: ['game_lines', 'points', 'rebounds', 'assists', 'threes', 'points_rebounds_assists'],
  nfl: ['game_lines', 'passing_yards', 'receiving_yards', 'rushing_yards', 'touchdowns'],
  ncaab: ['game_lines', 'points', 'rebounds']
};

interface BetBuilderHeaderProps {
    onLeagueChange: (league: 'nba' | 'nfl' | 'ncaab') => void;
    onMarketChange: (market: string) => void;
}

const BetBuilderHeader = ({ onLeagueChange, onMarketChange }: BetBuilderHeaderProps) => {
  const [activeLeague, setActiveLeague] = useState<'nba' | 'nfl' | 'ncaab'>('nba');
  const [activeMarket, setActiveMarket] = useState('game_lines');

  const handleLeague = (id: 'nba' | 'nfl' | 'ncaab') => {
    setActiveLeague(id);
    setActiveMarket('game_lines'); // Reset market when league changes
    onLeagueChange(id);
    onMarketChange('game_lines');
  };

  return (
    <div className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-20">
      {/* Tier 1: League Switcher */}
      <div className="flex gap-6 px-6 py-3 border-b border-slate-800/50">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => handleLeague(l.id as 'nba' | 'nfl' | 'ncaab')}
            className={`flex items-center gap-2 pb-1 text-sm font-bold transition-all ${
              activeLeague === l.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'
            }`}
          >
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </div>

      {/* Tier 2: Market Filters (Dynamic based on League) */}
      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
        {MARKET_MAP[activeLeague].map((m) => (
          <button
            key={m}
            onClick={() => { setActiveMarket(m); onMarketChange(m); }}
            className={`px-4 py-1.5 rounded-md text-[11px] uppercase font-black tracking-wider transition-colors whitespace-nowrap ${
              activeMarket === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {m.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BetBuilderHeader;
