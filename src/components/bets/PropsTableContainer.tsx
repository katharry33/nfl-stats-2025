// components/PropsTableContainer.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { PropsTable } from './PropsTable';
import { PropData } from './PropsTable';
import { PropCard } from './PropCard'; // assume this exists in components
import { FlexibleDataTable } from 'data-table/FlexibleDataTable';

type Sport = 'nba' | 'nfl';

interface UsePropsQueryArgs {
  sport: Sport;
  season?: number;
  date?: string;
  week?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  columns?: string[];
}

/**
 * Simple client-side hook that calls the server API and returns items.
 * Uses cursorless pagination for simplicity here; adapt to cursor-based if needed.
 */
function usePropsQuery({
  sport,
  season,
  date,
  week,
  search,
  page = 1,
  pageSize = 50,
  sortBy,
  sortDir,
  columns,
}: UsePropsQueryArgs) {
  const [data, setData] = useState<PropData[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams();
      params.set('league', sport);
      if (season) params.set('season', String(season));
      if (date) params.set('date', date);
      if (week) params.set('week', String(week));
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);
      if (columns && columns.length) params.set('columns', columns.join(','));

      const res = await fetch(`/api/props?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch props');
      const json = await res.json();
      setData(json.items || []);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message || 'Unknown');
    } finally {
      setLoading(false);
    }
  }, [sport, season, date, week, search, page, pageSize, sortBy, sortDir, columns]);

  React.useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return { data, total, loading, error, refetch: fetchPage };
}

export function PropsTableContainer({ initialSport = 'nba' as Sport }) {
  const [sport, setSport] = useState<Sport>(initialSport);
  const [season, setSeason] = useState<number>(sport === 'nba' ? 2025 : 2024);
  const [date, setDate] = useState<string>('');
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string | undefined>('line');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'table' | 'cards'>('table');

  const debouncedSetSearch = useMemo(() => debounce((v: string) => setSearch(v), 300), []);

  const { data, loading, total, refetch } = usePropsQuery({
    sport,
    season,
    date,
    week,
    search,
    page,
    pageSize: 50,
    sortBy,
    sortDir,
  });

  // Add to betslip placeholder
  const onAddLeg = (prop: PropData) => {
    // implement your betslip context or localStorage logic here
    console.log('add to slip', prop);
  };

  // Table columns (memoized)
  const columns = useMemo(
    () =>
      [
        {
          id: 'player',
          header: 'Player',
          accessorKey: 'player',
          cell: ({ row }: any) => (
            <div className="flex flex-col">
              <span className="font-black text-white uppercase tracking-tight">{row.original.player}</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">{row.original.team}</span>
            </div>
          ),
        },
        {
          id: 'prop',
          header: 'Market',
          accessorKey: 'prop',
          cell: ({ row }: any) => (
            <div className="text-xs font-black uppercase tracking-widest text-indigo-400">{String(row.original.prop).replace('_', ' ')}</div>
          ),
        },
        {
          id: 'line',
          header: 'Line',
          accessorKey: 'line',
          cell: ({ row }: any) => <span className="font-mono font-bold text-lg text-white">{row.original.line}</span>,
        },
        {
          id: 'odds',
          header: 'Odds',
          accessorKey: 'odds',
          cell: ({ row }: any) => (
            <span className={row.original.odds > 0 ? 'text-emerald-400' : 'text-zinc-300'}>
              {row.original.odds > 0 ? `+${row.original.odds}` : row.original.odds}
            </span>
          ),
        },
        {
          id: 'actions',
          header: '',
          cell: ({ row }: any) => (
            <button
              onClick={() => onAddLeg(row.original)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95"
            >
              Add to Slip
            </button>
          ),
        },
      ] as ColumnDef<PropData>[],
    []
  );

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSport('nba');
              setSeason(2025);
            }}
            className={`px-3 py-1 rounded ${sport === 'nba' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-300'}`}
          >
            NBA
          </button>
          <button
            onClick={() => {
              setSport('nfl');
              setSeason(2024);
            }}
            className={`px-3 py-1 rounded ${sport === 'nfl' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-300'}`}
          >
            NFL
          </button>
        </div>

        <input
          placeholder="Search player or matchup"
          onChange={(e) => debouncedSetSearch(e.target.value)}
          className="px-3 py-2 rounded bg-white/5 text-sm text-white"
          aria-label="Search props"
        />

        {sport === 'nba' ? (
          <input type="date" onChange={(e) => setDate(e.target.value)} className="px-2 py-1 rounded bg-white/5 text-sm" />
        ) : (
          <input
            type="number"
            min={1}
            max={18}
            onChange={(e) => setWeek(Number(e.target.value))}
            placeholder="Week"
            className="px-2 py-1 rounded bg-white/5 text-sm"
          />
        )}

        <select value={season} onChange={(e) => setSeason(Number(e.target.value))} className="px-2 py-1 rounded bg-white/5 text-sm">
          {sport === 'nba' ? (
            <option value={2025}>2025-26</option>
          ) : (
            <>
              <option value={2024}>2024-25</option>
              <option value={2025}>2025-26</option>
            </>
          )}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setView('table')} className={`px-2 py-1 rounded ${view === 'table' ? 'bg-indigo-600' : 'bg-white/5'}`}>
            Table
          </button>
          <button onClick={() => setView('cards')} className={`px-2 py-1 rounded ${view === 'cards' ? 'bg-indigo-600' : 'bg-white/5'}`}>
            Cards
          </button>
          <button onClick={() => refetch()} className="px-2 py-1 rounded bg-white/5">
            Refresh
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl">
          <FlexibleDataTable tableId="props-selection-table" columns={columns} data={data} isLoading={loading} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && data.length === 0 ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : data.length === 0 ? (
            <div className="col-span-full text-center py-8">No props found</div>
          ) : (
            data.map((p) => <PropCard key={p.id} prop={p as any} onAddToBetSlip={onAddLeg} />)
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-500">Total: {total}</div>
    </div>
  );
}
