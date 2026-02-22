'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { BetSlip } from '@/components/bets/betslip';
import { PropData, BetLeg } from '@/lib/types';
import { Search, RotateCcw, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────────────────

const SEASONS = [
  { label: '2025 Season', value: '2025' },
  { label: '2024 Season', value: '2024' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AllPropsPage() {
  const { addLeg, selections } = useBetSlip();

  // Data state
  const [props, setProps]                 = useState<PropData[]>([]);
  const [loading, setLoading]             = useState(false);
  const [hasSearched, setHasSearched]     = useState(false);
  const [totalDbVolume, setTotalDbVolume] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{
    weeks: number[];
    propTypes: string[];
  }>({ weeks: [], propTypes: [] });

  // Season drives which collection is queried
  const [season, setSeason]               = useState('2025');

  // Search form
  const [playerInput, setPlayerInput]     = useState('');
  const [weekInput, setWeekInput]         = useState('all');
  const [propTypeInput, setPropTypeInput] = useState('All Props');
  const [matchupFilter, setMatchupFilter] = useState('');

  // ── Load filter options whenever season changes ──────────────────────────
  useEffect(() => {
    setProps([]);
    setHasSearched(false);
    setWeekInput('all');
    setPropTypeInput('All Props');
    setFilterOptions({ weeks: [], propTypes: [] });
    setTotalDbVolume(0);

    fetch(`/api/all-props/options?season=${season}`)
      .then(r => r.json())
      .then(data => {
        setFilterOptions({
          weeks:     data.weeks     ?? [],
          propTypes: data.propTypes ?? ['All Props'],
        });
        if (data.totalVolume) setTotalDbVolume(data.totalVolume);
      })
      .catch(() => toast.error('Could not load filter options.'));
  }, [season]);

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    const params = new URLSearchParams({ season });
    if (playerInput.trim())                             params.append('player',   playerInput.trim());
    if (weekInput !== 'all')                            params.append('week',     weekInput);
    if (propTypeInput && propTypeInput !== 'All Props') params.append('propType', propTypeInput);

    try {
      const res = await fetch(`/api/all-props?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: PropData[] = await res.json();
      setProps(data);
    } catch {
      toast.error('Failed to fetch historical props.');
      setProps([]);
    } finally {
      setLoading(false);
    }
  }, [playerInput, weekInput, propTypeInput, season]);

  const handleReset = () => {
    setPlayerInput('');
    setWeekInput('all');
    setPropTypeInput('All Props');
    setMatchupFilter('');
    setProps([]);
    setHasSearched(false);
  };

  // ── Client-side matchup filter ───────────────────────────────────────────
  const displayedProps = useMemo(() => {
    if (!matchupFilter.trim()) return props;
    return props.filter(p =>
      (p.matchup || p.Matchup || '')
        .toLowerCase()
        .includes(matchupFilter.toLowerCase())
    );
  }, [props, matchupFilter]);

  // ── Bet slip actions ─────────────────────────────────────────────────────
  const handleAdd = (prop: PropData, selection: 'Over' | 'Under') => {
    const propId = prop.id || `${prop.player}-${prop.prop}-${prop.line}`;
    if (selections.some(l => l.propId === propId && l.selection === selection)) {
      toast.info('Already in your bet slip.');
      return;
    }
    const leg: BetLeg = {
      id:        `${propId}-${selection}-${Date.now()}`,
      propId,
      player:    toTitleCase(prop.player || prop.Player || 'Unknown'),
      prop:      prop.prop  || prop.Prop  || '',
      line:      Number(prop.line || prop.Line || 0),
      selection,
      odds:      selection === 'Over'
                   ? (prop.overOdds  ?? prop.odds ?? -110)
                   : (prop.underOdds ?? prop.odds ?? -110),
      matchup:   prop.matchup || prop.Matchup || '',
      team:      (prop.team || prop.Team || '').toUpperCase(),
      week:      (prop.week || prop.Week) ? Number(prop.week || prop.Week) : undefined,
      status:    'pending',
      gameDate:  prop.gameDate || prop.GameDate || new Date().toISOString(),
      source:    `historical-props-${season}`,
    };
    addLeg(leg);
  };

  const isInSlip = (prop: PropData, selection: 'Over' | 'Under') => {
    const propId = prop.id || `${prop.player}-${prop.prop}-${prop.line}`;
    return selections.some(l => l.propId === propId && l.selection === selection);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Historical Props
              </h1>
              <p className="text-slate-500 text-xs font-mono">
                Collection: allProps_{season}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Database Volume
              </p>
              <p className="text-xl font-mono text-blue-500 font-bold">
                {totalDbVolume.toLocaleString()}
              </p>
            </div>
          </header>

          {/* Season toggle — prominent, above the search form */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Season
            </span>
            <div className="flex rounded-lg overflow-hidden border border-slate-800">
              {SEASONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSeason(s.value)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase transition-colors ${
                    season === s.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {season === '2024' && (
              <span className="text-[10px] text-amber-500/80 font-mono">
                ← migrated from weeklyProps_2024
              </span>
            )}
          </div>

          {/* Search form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Player</Label>
              <Input
                placeholder="e.g. Saquon Barkley"
                value={playerInput}
                onChange={e => setPlayerInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-white"
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
                  {filterOptions.weeks.map(w => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
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
                  {filterOptions.propTypes.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase h-9"
              >
                {loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <Search className="h-3.5 w-3.5 mr-1.5" />}
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

          {/* Matchup filter + result count */}
          {hasSearched && props.length > 0 && (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Filter by matchup (e.g. PHI @ NYG)"
                value={matchupFilter}
                onChange={e => setMatchupFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-64 focus:border-blue-500 outline-none placeholder:text-slate-600"
              />
              <span className="text-[10px] text-slate-500 uppercase font-mono ml-auto">
                {displayedProps.length} result{displayedProps.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Results table */}
          <div className="bg-slate-900/20 rounded-xl border border-slate-800 overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-slate-500 text-sm font-mono uppercase animate-pulse">
                  Searching {season} props...
                </p>
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Search className="h-10 w-10 text-slate-700" />
                <p className="text-slate-400 text-sm font-semibold">Search to load props</p>
                <p className="text-slate-600 text-xs text-center max-w-xs">
                  {totalDbVolume > 0
                    ? `All ${totalDbVolume.toLocaleString()} props from the ${season} season are available.`
                    : `Enter a player name, week, or prop type above.`}
                </p>
              </div>
            ) : displayedProps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-2">
                <p className="text-slate-400 text-sm">No props found</p>
                <p className="text-slate-600 text-xs">Try different criteria or switch seasons</p>
              </div>
            ) : (
              <table className="w-full text-sm text-white">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Prop / Line
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Matchup
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Add to Slip
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedProps.map((prop, i) => {
                    const overIn   = isInSlip(prop, 'Over');
                    const underIn  = isInSlip(prop, 'Under');
                    const player   = toTitleCase(prop.player || prop.Player || '');
                    const propLabel = prop.prop || prop.Prop || '';
                    const line     = Number(prop.line || prop.Line || 0);
                    const matchup  = prop.matchup || prop.Matchup || '—';
                    const week     = prop.week || prop.Week;

                    return (
                      <tr
                        key={prop.id || i}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                          {player}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-slate-300">{propLabel}</span>
                          <span className="ml-2 font-mono font-bold text-white">{line}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs whitespace-nowrap">
                          {matchup}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs whitespace-nowrap">
                          {week ? `WK ${week}` : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <SelectionPill
                              label="OVER"
                              active={overIn}
                              color="blue"
                              onClick={() => handleAdd(prop, 'Over')}
                            />
                            <SelectionPill
                              label="UNDER"
                              active={underIn}
                              color="orange"
                              onClick={() => handleAdd(prop, 'Under')}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <BetSlip />
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────────────────────────

function SelectionPill({
  label, active, color, onClick,
}: {
  label: string;
  active: boolean;
  color: 'blue' | 'orange';
  onClick: () => void;
}) {
  const base = 'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all';
  const styles = {
    blue: active
      ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30'
      : 'bg-slate-800 text-slate-400 hover:bg-blue-900/50 hover:text-blue-300',
    orange: active
      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
      : 'bg-slate-800 text-slate-400 hover:bg-orange-900/50 hover:text-orange-300',
  };
  return (
    <button onClick={onClick} className={`${base} ${styles[color]}`}>
      {active && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
      {label}
    </button>
  );
}