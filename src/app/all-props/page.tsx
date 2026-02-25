'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { HistoricalBetSlip } from '@/components/bets/historical-betslip';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';

export default function AllPropsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ player: '', prop: '', week: '', season: '2025' });
  const [inputs, setInputs] = useState({ player: '', prop: '', week: '', season: '2025' });

  const fetchProps = useCallback(async (currentCursor: string | null = null, isNewSearch = false) => {
    setLoading(true);
    try {
      const url = new URL('/api/all-props', window.location.origin);
      if (currentCursor) url.searchParams.set('cursor', currentCursor);
      url.searchParams.set('year', inputs.season);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (isNewSearch) {
        setItems(data.props);
      } else {
        setItems(prev => [...prev, ...data.props]);
      }
      
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [inputs.season]);

  useEffect(() => {
    fetchProps(null, true);
  }, [fetchProps, filters]);

  const handleLoadMore = () => {
    if (cursor && !loading) {
      fetchProps(cursor);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...inputs });
  };

  const filteredData = useMemo(() => {
    return items.filter(p => {
      const playerMatch = !inputs.player || p.player?.toLowerCase().includes(inputs.player.toLowerCase());
      const propMatch = !inputs.prop || p.prop?.toLowerCase().includes(inputs.prop.toLowerCase());
      const weekMatch = !inputs.week || String(p.week) === inputs.week;
      return playerMatch && propMatch && weekMatch;
    });
  }, [items, inputs]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-slate-950">
      <div className="flex-1 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Historical Props</h1>
        </header>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
           <input 
            placeholder="Player" 
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            value={inputs.player}
            onChange={e => setInputs({...inputs, player: e.target.value})}
          />
          <input 
            placeholder="Prop" 
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            value={inputs.prop}
            onChange={e => setInputs({...inputs, prop: e.target.value})}
          />
          <input 
            placeholder="Week" 
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            value={inputs.week}
            onChange={e => setInputs({...inputs, week: e.target.value})}
          />
          <select 
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
            value={inputs.season}
            onChange={e => setInputs({...inputs, season: e.target.value})}
          >
            <option value="2025">2025 Season</option>
            <option value="2024">2024 Season</option>
             <option value="all">All Seasons</option>
          </select>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2">
            <Search size={16} /> Search
          </button>
        </form>

        <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
             <thead className="bg-slate-900/80 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Prop</th>
                <th className="px-6 py-4">Line</th>
                <th className="px-6 py-4">Matchup / Wk</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredData.map((leg, i) => (
                <tr key={leg.id || i} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{leg.player}</div>
                    <div className="text-[10px] text-slate-600 uppercase">{leg.team}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium">{leg.prop}</td>
                  <td className="px-6 py-4 font-mono text-sm text-emerald-400">{leg.line}</td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">{leg.matchup}</div>
                    <div className="text-[10px] text-slate-400">Week {leg.week}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="w-24 ml-auto">
                       <AddToBetslipButton prop={leg} selection={leg.selection || 'Over'} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {hasMore && (
            <div className="p-4 bg-slate-900/20 border-t border-slate-800 flex justify-center">
              <button 
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full max-w-xs py-3 text-sm font-bold text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all rounded-lg border border-dashed border-slate-800 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Fetching More...
                  </span>
                ) : (
                  "Load More Results"
                )}
              </button>
            </div>
          )}

        </div>
         <div className="text-xs text-slate-500 font-mono">
            Showing {filteredData.length} results. {hasMore ? 'More available.' : 'End of results.'}
          </div>
      </div>

      <div className="w-full lg:w-96 shrink-0">
        <div className="sticky top-6">
          <HistoricalBetSlip />
        </div>
      </div>
    </div>
  );
}
