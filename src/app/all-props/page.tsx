'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { BetsTable } from '@/components/bets/bets-table';
import { BetSlip } from '@/components/bets/betslip';
import { Bet, BetLeg, PropData, BetType } from '@/lib/types';
import { Search, RotateCcw, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

const transformPropToBet = (prop: PropData): Bet => {
  const rawPlayer = prop.player || prop.Player || 'N/A';

  const leg: BetLeg = {
    id: prop.id || crypto.randomUUID(),
    propId: prop.id,
    player: toTitleCase(rawPlayer),           // ← capitalized
    team: (prop.team || prop.Team || 'N/A').toUpperCase(),
    prop: prop.prop || prop.Prop || 'N/A',
    line: Number(prop.line || prop.Line || 0),
    odds: Number(prop.odds || prop.Odds || -110),
    selection: prop.overunder === 'Over' || prop['Over/Under?'] === 'Over' ? 'Over' : 'Under',
    status: 'pending',
    gameDate: prop.gameDate || prop.GameDate || new Date().toISOString(),
    matchup: prop.matchup || prop.Matchup || 'TBD',
    week: (prop.week || prop.Week) ? Number(prop.week || prop.Week) : undefined,
  };

  return {
    id: leg.id,
    userId: 'system',
    betType: 'Single',
    stake: 0,
    odds: leg.odds,
    status: 'pending',
    legs: [leg],
    createdAt: new Date(),
  };
};

// ---------------------------------------------------------------------------

export default function AllPropsPage() {
  const { addLeg } = useBetSlip();

  // Data
  const [props, setProps]           = useState<Bet[]>([]);
  const [loading, setLoading]       = useState(false);   // ← false on mount (no initial load)
  const [hasSearched, setHasSearched] = useState(false); // ← track if user has searched
  const [totalDbVolume, setTotalDbVolume] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ weeks: number[]; propTypes: string[] }>({
    weeks: [],
    propTypes: [],
  });

  // Search form state (inputs — not yet applied)
  const [playerInput, setPlayerInput]       = useState('');
  const [teamInput, setTeamInput]           = useState('');
  const [weekInput, setWeekInput]           = useState('all');
  const [propTypeInput, setPropTypeInput]   = useState('All Props');

  // Table filter + sort (applied after data loads)
  const [weekFilter, setWeekFilter]         = useState<string>('all');
  const [matchupFilter, setMatchupFilter]   = useState<string>('');
  const [sortConfig, setSortConfig]         = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });

  // Load filter options on mount (lightweight — just week numbers and prop types)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/all-props/options');
        if (!response.ok) throw new Error('Failed to fetch filter options');
        const data = await response.json();
        setFilterOptions(data);
        if (data.totalVolume) setTotalDbVolume(data.totalVolume);
      } catch (error) {
        console.error(error);
        toast.error('Could not load filter options.');
      }
    };
    fetchOptions();
  }, []);

  // Search — only runs when user explicitly clicks Search or presses Enter
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    const params = new URLSearchParams();
    if (playerInput.trim())                               params.append('player', playerInput.trim());
    if (teamInput.trim())                                 params.append('team', teamInput.trim().toUpperCase());
    if (weekInput !== 'all')                              params.append('week', weekInput);
    if (propTypeInput && propTypeInput !== 'All Props')   params.append('propType', propTypeInput);

    try {
      const response = await fetch(`/api/all-props?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch props');
      const data: PropData[] = await response.json();
      setProps(data.map(transformPropToBet));
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch historical props.');
      setProps([]);
    } finally {
      setLoading(false);
    }
  }, [playerInput, teamInput, weekInput, propTypeInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleReset = () => {
    setPlayerInput('');
    setTeamInput('');
    setWeekInput('all');
    setPropTypeInput('All Props');
    setWeekFilter('all');
    setMatchupFilter('');
    setProps([]);
    setHasSearched(false);
  };

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Client-side filtering + sorting on top of search results
  const processedBets = useMemo(() => {
    let filtered = [...props];

    if (weekFilter !== 'all') {
      filtered = filtered.filter(b => b.legs[0]?.week?.toString() === weekFilter);
    }

    if (matchupFilter) {
      filtered = filtered.filter(b =>
        b.legs[0]?.matchup?.toLowerCase().includes(matchupFilter.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const valA = (a.legs[0] as any)?.[sortConfig.key] ?? (a as any)[sortConfig.key];
      const valB = (b.legs[0] as any)?.[sortConfig.key] ?? (b as any)[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [props, weekFilter, matchupFilter, sortConfig]);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Historical Props</h1>
              <p className="text-slate-500 text-xs font-mono">Collection: allProps_2025</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Database Volume</p>
              <p className="text-xl font-mono text-blue-500 font-bold">{totalDbVolume.toLocaleString()}</p>
            </div>
          </header>

          {/* Search form */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Player</Label>
              <Input
                placeholder="Search..."
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Team</Label>
              <Input
                placeholder="LAL, NYG..."
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-white uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Week</Label>
              <Select value={weekInput} onValueChange={setWeekInput}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="all">All Weeks</SelectItem>
                  {filterOptions.weeks.map(week => (
                    <SelectItem key={week} value={String(week)}>Week {week}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Prop Type</Label>
              <Select value={propTypeInput} onValueChange={setPropTypeInput}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {filterOptions.propTypes.map(prop => (
                    <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase h-9"
              >
                {loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  : <Search className="h-3.5 w-3.5 mr-2" />
                }
                Search
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-slate-500 hover:text-white border border-slate-800 h-9 px-3"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Table filters (only show after a search) */}
          {hasSearched && props.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center bg-slate-900/40 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-400 uppercase">Filter:</span>
              </div>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:border-emerald-500 outline-none"
              >
                <option value="all">All Weeks</option>
                {filterOptions.weeks.map(w => (
                  <option key={w} value={String(w)}>Week {w}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Filter matchup (e.g. PHI @ NYG)"
                value={matchupFilter}
                onChange={(e) => setMatchupFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1 w-56 focus:border-emerald-500 outline-none placeholder:text-slate-600"
              />
              <div className="ml-auto text-[10px] text-slate-500 uppercase font-mono">
                {processedBets.length} result{processedBets.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-slate-900/20 rounded-xl border border-slate-800 overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-slate-500 text-sm font-mono animate-pulse uppercase">Searching...</p>
              </div>
            ) : !hasSearched ? (
              // Empty state — prompt user to search
              <div className="flex flex-col items-center justify-center py-32 space-y-3 text-center">
                <Search className="h-10 w-10 text-slate-700" />
                <p className="text-slate-400 text-sm font-semibold">Search to load props</p>
                <p className="text-slate-600 text-xs max-w-xs">
                  Enter a player name, team, or select a week above and press Search.
                  All {totalDbVolume.toLocaleString()} props are available.
                </p>
              </div>
            ) : processedBets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-2">
                <p className="text-slate-400 text-sm">No props found</p>
                <p className="text-slate-600 text-xs">Try different search criteria</p>
              </div>
            ) : (
              <BetsTable bets={processedBets} isLibraryView={true} onSort={toggleSort} />
            )}
          </div>

        </div>
      </main>
      <BetSlip />
    </div>
  );
}