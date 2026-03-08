'use client';

import React, { useState } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown, Zap } from 'lucide-react';
import { NFLProp } from '@/lib/types';

interface BetBuilderTableProps {
  props: NFLProp[];
  isLoading: boolean;
  isInBetSlip: (id: string) => boolean;
  onAddToBetSlip: (prop: NFLProp) => void;
  onRemoveFromBetSlip: (id: string) => void;
}

export default function BetBuilderTable({
  props,
  isLoading,
  isInBetSlip,
  onAddToBetSlip,
  onRemoveFromBetSlip,
}: BetBuilderTableProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const groupedProps = props.reduce((acc, prop) => {
    const key = prop.player ?? prop.Player ?? 'Unknown Player';
    if (!acc[key]) acc[key] = [];
    acc[key].push(prop);
    return acc;
  }, {} as Record<string, NFLProp[]>);

  const togglePlayer = (player: string) => {
    const next = new Set(expandedPlayers);
    next.has(player) ? next.delete(player) : next.add(player);
    setExpandedPlayers(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {Object.entries(groupedProps).map(([playerName, playerProps]) => {
        const isExpanded = expandedPlayers.has(playerName);
        const team    = playerProps[0]?.team ?? playerProps[0]?.Team ?? '';
        const matchup = playerProps[0]?.matchup ?? playerProps[0]?.Matchup ?? '';

        return (
          <div
            key={playerName}
            className={`
              transition-all duration-300 rounded-[2rem] border
              ${isExpanded ? 'bg-[#111318] border-white/10 shadow-2xl' : 'bg-[#0f1115] border-white/5 hover:border-white/10'}
            `}
          >
            {/* Player Row */}
            <div
              onClick={() => togglePlayer(playerName)}
              className="px-6 py-4 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center font-black text-[10px] text-[#FFD700] italic">
                  {team.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-black italic uppercase tracking-tight group-hover:text-[#FFD700] transition-colors">
                    {playerName}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {team} <span className="mx-1 opacity-20">•</span> {matchup}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-zinc-600 uppercase bg-black/40 px-3 py-1 rounded-full border border-white/5">
                  {playerProps.length} Lines
                </span>
                <button onClick={(e) => { e.stopPropagation(); togglePlayer(playerName); }}>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                    : <ChevronRight className="w-4 h-4 text-zinc-700" />}
                </button>
              </div>
            </div>

            {/* Markets Grid */}
            {isExpanded && (
              <div className="px-4 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                {playerProps.map((prop) => {
                  const propId = prop.id ?? '';
                  const active = propId ? isInBetSlip(propId) : false;
                  return (
                    <button
                      key={propId || `${prop.player}-${prop.prop}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!propId) return;
                        active ? onRemoveFromBetSlip(propId) : onAddToBetSlip(prop);
                      }}
                      className={`
                        relative flex flex-col p-4 rounded-2xl border text-left transition-all group/card
                        ${active
                          ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-yellow-900/10'
                          : 'bg-black/40 border-white/5 text-white hover:border-[#FFD700]/40'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-black/60' : 'text-zinc-500'}`}>
                          {prop.prop ?? prop.Prop}
                        </span>
                        {active && <Zap className="w-3 h-3 fill-black animate-pulse" />}
                      </div>

                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-black italic tracking-tighter leading-none">
                          {prop.line ?? prop.Line}
                        </span>
                        <div className={`
                          w-8 h-8 rounded-xl flex items-center justify-center border transition-colors
                          ${active
                            ? 'bg-black text-white border-black'
                            : 'bg-zinc-900 border-white/10 text-[#FFD700] group-hover/card:bg-[#FFD700] group-hover/card:text-black group-hover/card:border-[#FFD700]'}
                        `}>
                          {active ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}