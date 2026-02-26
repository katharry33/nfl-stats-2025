'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HistoricalBetSlip } from '@/components/bets/historical-betslip';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';
import { X } from 'lucide-react';

export default function AllPropsPage() {
  const [allLegs, setAllLegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('all'); // New season filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    prop: '',
    week: '',
  });

  const fetchHistoricalProps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        season: seasonFilter, // Use seasonFilter
        prop: filters.prop,
        week: filters.week,
      });

      const response = await fetch(`/api/all-props?${params.toString()}`);
      const data = await response.json();
      
      if (data.props) {
        setAllLegs(data.props);
      }
    } catch (error) {
      console.error("Failed to fetch props:", error);
    } finally {
      setLoading(false);
    }
  }, [seasonFilter, filters]);

  useEffect(() => {
    fetchHistoricalProps();
  }, [fetchHistoricalProps]);

  const filteredLegs = useMemo(() => {
    if (!searchTerm) return allLegs;
    
    const lcSearch = searchTerm.toLowerCase();
    return allLegs.filter(item => 
      (item.player && item.player.toLowerCase().includes(lcSearch)) || 
      (item.prop && item.prop.toLowerCase().includes(lcSearch)) ||
      (item.matchup && item.matchup.toLowerCase().includes(lcSearch))
    );
  }, [searchTerm, allLegs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 min-h-screen bg-slate-950 text-slate-200">
      <div className="lg:col-span-3 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">Historical Props</h1>
        </header>

        {/* Filter and Search Controls */}
        <div className="flex flex-wrap items-end gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {/* SEASON FILTER */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Season</label>
            <select 
              value={seasonFilter} 
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-4 py-2 outline-none w-40 h-[34px]"
            >
              <option value="all">All Seasons</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* CLIENT-SIDE SEARCH */}
          <div className="flex flex-col gap-1.5 flex-grow min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Search</label>
            <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by player, team, or prop..."
                  className="bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 w-full h-[34px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
          </div>

          {/* Prop Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Prop Type</label>
            <select 
              value={filters.prop} 
              onChange={(e) => handleFilterChange('prop', e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-4 py-2 outline-none w-40 h-[34px]"
            >
              <option value="">All Props</option>
              <option value="REC YARDS">REC YARDS</option>
              <option value="RUSH YARDS">RUSH YARDS</option>
              <option value="PASS YARDS">PASS YARDS</option>
              <option value="ANYTIME TD">ANYTIME TD</option>
            </select>
          </div>

          {/* Week Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Week</label>
            <select 
              value={filters.week} 
              onChange={(e) => handleFilterChange('week', e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-4 py-2 outline-none w-32 h-[34px]"
            >
              <option value="">All Weeks</option>
              {Array.from({ length: 18 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm text-slate-300">
                Displaying <span className="font-mono text-emerald-400 font-bold">{filteredLegs.length}</span> 
                <span className="text-slate-500 mx-2">of</span>
                <span className="font-mono text-slate-200">{allLegs.length}</span> records
                </p>
            </div>
            
            {seasonFilter !== 'all' && (
                <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
                Season {seasonFilter}
                </span>
            )}
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></span>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">Prop</th>
                  <th className="px-6 py-4">Line</th>
                  <th className="px-6 py-4">Matchup / Wk</th>
                  <th className="px-6 py-4">Game Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredLegs.map((leg, i) => (
                  <tr key={leg.id || i} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">{leg.player}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">{leg.prop}</td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400">{leg.line}</td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] text-slate-500 font-mono uppercase">{leg.matchup}</div>
                      <div className="text-[10px] text-slate-400">Week {leg.week}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{leg.gameDate ? new Date(leg.gameDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-24 ml-auto">
                         <AddToBetslipButton prop={leg} selection={leg.selection || 'Over'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!loading && filteredLegs.length === 0 && (
               <div className="p-8 text-center text-slate-500 text-sm italic">
                {allLegs.length > 0 && searchTerm ? 
                  `No results for "${searchTerm}"` : 
                  `No historical data found for your filters in ${seasonFilter}.`
                }
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <aside className="sticky top-20">
          <HistoricalBetSlip />
        </aside>
      </div>
    </div>
  );
}