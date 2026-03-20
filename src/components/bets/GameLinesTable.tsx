'use client';

import React from 'react';

interface Team {
  abbreviation?: string;
}

interface Game {
  id: string;
  visitor_team?: Team;
  home_team?: Team;
}

interface GameLinesTableProps {
  games: Game[];
}

const GameLinesTable = ({ games }: GameLinesTableProps) => {
  return (
    <div className="w-full space-y-2 mt-2">
      {games.map((game) => (
        <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
          {/* Teams */}
          <div className="flex flex-col gap-1 w-1/3">
            <div className="text-xs font-bold text-slate-300">{game.visitor_team?.abbreviation || 'AWAY'}</div>
            <div className="text-xs font-bold text-slate-300">{game.home_team?.abbreviation || 'HOME'}</div>
          </div>

          {/* Lines (Spread, Total, Moneyline) */}
          <div className="flex gap-2 w-2/3 justify-end">
             {/* Spread Slot */}
             <div className="flex flex-col gap-1">
                <button className="h-8 w-16 bg-slate-800 rounded text-[10px] font-mono hover:bg-blue-900">+4.5</button>
                <button className="h-8 w-16 bg-slate-800 rounded text-[10px] font-mono hover:bg-blue-900">-4.5</button>
             </div>
             {/* Total Slot */}
             <div className="flex flex-col gap-1">
                <button className="h-8 w-16 bg-slate-800 rounded text-[10px] font-mono hover:bg-blue-900">O 220.5</button>
                <button className="h-8 w-16 bg-slate-800 rounded text-[10px] font-mono hover:bg-blue-900">U 220.5</button>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameLinesTable;
