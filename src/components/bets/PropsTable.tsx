import React from 'react';
import type { NormalizedProp } from '@/hooks/useAllProps';
import { Loader2, Trash2, Plus } from 'lucide-react';

interface PropsTableProps {
  props: NormalizedProp[];
  isLoading: boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  slipIds?: Set<string>;
  onDelete?: (id: string) => Promise<void>;
  visibleColumns?: string[];
}

export function PropsTable({ 
  props = [], 
  isLoading, 
  onAddToBetSlip, 
  slipIds = new Set(),
  onDelete,
  visibleColumns = [],
}: PropsTableProps) {

  const isVisible = (id: string) => visibleColumns.length === 0 || visibleColumns.includes(id);

  if (isLoading && props.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm font-black uppercase italic">Loading data table...</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0f1115]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            {isVisible('week') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500">Wk/Date</th>}
            {isVisible('player') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500">Player</th>}
            {isVisible('matchup') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500">Matchup</th>}
            <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Prop/Line</th>
            {isVisible('avg') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Avg</th>}
            {isVisible('oppRank') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Opp Rank</th>}
            {isVisible('hitPct') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Hit %</th>}
            {isVisible('edge') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Edge/EV</th>}
            {isVisible('conf') && <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-center">Conf</th>}
            <th className="px-3 py-3 text-[9px] font-black uppercase text-zinc-500 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {props.map((prop, i) => {
            const propId = prop.id ? String(prop.id) : `idx-${i}`;
            const inSlip = slipIds.has(propId);

            return (
              <tr key={propId} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02]">
                  {isVisible('week') && (
                    <td className="px-3 py-3 font-mono text-[10px] text-zinc-500">
                      W{prop.week} <br/> {prop.gameDate ? new Date(prop.gameDate).toLocaleDateString([], {month:'short', day:'numeric'}) : ''}
                    </td>
                  )}
                  {isVisible('player') && (
                    <td className="px-3 py-3 text-xs font-bold text-white uppercase italic">
                      {prop.player}
                    </td>
                  )}
                  {isVisible('matchup') && (
                    <td className="px-3 py-3 text-xs text-zinc-400">
                      {prop.team} @ {prop.matchup}
                    </td>
                  )}

                  <td className="px-3 py-3 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-medium">{prop.prop}</p>
                    <div>
                      <span className="font-mono text-xs font-bold text-white">{prop.line}</span>
                      <span className={`ml-1 text-[9px] font-black uppercase ${prop.overUnder?.toLowerCase()==='over'?'text-blue-400':'text-orange-400'}`}>
                          {prop.overUnder?.charAt(0)}
                      </span>
                    </div>
                  </td>

                  {isVisible('avg') && <td className="px-3 py-3 text-center font-mono text-xs text-zinc-300">
                      {prop.playerAvg ? Number(prop.playerAvg).toFixed(1) : '—'}
                  </td>}

                  {isVisible('oppRank') && <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold ${Number(prop.opponentRank) <= 10 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {prop.opponentRank ?? '—'}
                      </span>
                  </td>}

                  {isVisible('hitPct') && <td className="px-3 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-[#FFD700]">
                          {prop.seasonHitPct ? (Number(prop.seasonHitPct)*100).toFixed(0)+'%' : '—'}
                      </span>
                  </td>}

                  {isVisible('edge') && <td className="px-3 py-3 text-center">
                      <p className="text-[10px] font-bold text-emerald-400 leading-none">{prop.bestEdgePct ? `+${(prop.bestEdgePct*100).toFixed(1)}%` : '—'}</p>
                      <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{prop.expectedValue ? `EV: ${prop.expectedValue.toFixed(2)}` : ''}</p>
                  </td>}

                  {isVisible('conf') && <td className="px-3 py-3 text-center">
                      <div className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300">
                          {prop.confidenceScore?.toFixed(1) ?? '—'}
                      </div>
                  </td>}

                  <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onDelete && (
                          <button 
                            onClick={() => prop.id && onDelete(String(prop.id))}
                            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => !inSlip && onAddToBetSlip(prop)}
                          disabled={inSlip}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                              inSlip 
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                              : 'bg-[#FFD700] text-black hover:bg-[#e6c200]'
                          }`}>
                          {inSlip ? 'Added' : <><Plus className="h-3 w-3" /> Add</>}
                      </button>
                      </div>
                  </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
