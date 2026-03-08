'use client';

import React, { useState } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown, Zap } from 'lucide-react';
import { NFLProp } from '@/lib/types';

// Define a local interface that matches what the hook actually sends
interface BetBuilderProp extends Omit<NFLProp, 'actualResult'> {
  id: string;
  actualResult?: string | any;
}

interface BetBuilderTableProps {
  // Use the widened type here
  props: BetBuilderProp[];
  isLoading: boolean;
  isInBetSlip: (id: string) => boolean;
  onAddToBetSlip: (prop: any) => void;
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

  // Grouping props by player
  const groupedProps = props.reduce((acc, prop) => {
    const key = prop.player || 'Unknown Player';
    if (!acc[key]) acc[key] = [];
    acc[key].push(prop);
    return acc;
  }, {} as Record<string, BetBuilderProp[]>);

  const togglePlayer = (player: string) => {
    const next = new Set(expandedPlayers);
    next.has(player) ? next.delete(player) : next.add(player);
    setExpandedPlayers(next);
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-zinc-500">Loading Markets...</div>;

  return (
    <div className="space-y-3 pb-20">
      {Object.entries(groupedProps).map(([playerName, playerProps]) => {
        const isExpanded = expandedPlayers.has(playerName);
        const firstProp = playerProps[0];
        const playerKey = `group-${playerName}-${playerProps[0]?.team || 'no-team'}`;

        return (
          <div key={playerKey} className="bg-[#0f1115] border border-white/5 rounded-[2rem] overflow-hidden">
            <div 
              onClick={() => togglePlayer(playerName)} // playerName is a string from Object.entries
              className="px-6 py-4 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center font-black text-[10px] text-[#FFD700] italic">
                  {(firstProp?.team || 'NFL').slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-black italic uppercase tracking-tight group-hover:text-[#FFD700] transition-colors">
                    {playerName}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {firstProp?.team} <span className="mx-1 opacity-20">•</span> {firstProp?.matchup}
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-[#FFD700]" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
            </div>

            {isExpanded && (
              <div className="px-4 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {playerProps.map((prop, index) => {
                  const uniquePropKey = prop.id || `${playerName}-prop-${index}`;
                  const active = prop.id ? isInBetSlip(prop.id) : false;
                  
                  return (
                    <button 
                      key={uniquePropKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        // CRITICAL: Ensure we only pass if ID exists
                        if (!prop.id) return;
                        active ? onRemoveFromBetSlip(prop.id) : onAddToBetSlip(prop);
                      }}
                      className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all ${                        active ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-black/40 border-white/5 text-white'                      }`}>
                      <div className="flex justify-between items-start mb-3">
                        {/* FIX: Ensure we only render strings/numbers, never the 'prop' object */}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-black/60' : 'text-zinc-500'}`}>
                          {String(prop.prop)} 
                        </span>
                        {active && <Zap className="w-3 h-3 fill-black" />}
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-black italic tracking-tighter leading-none">
                          {prop.line}
                        </span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center border bg-zinc-900 border-white/10">
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