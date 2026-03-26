'use client';

import React, { useState, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { PropsTable } from './PropsTable';
import { PropData } from '@/lib/types';
import { usePropsQuery } from '@/hooks/usePropsQuery';

type Sport = 'nba' | 'nfl';

export function PropsTableContainer({ initialSport = 'nba' as Sport }) {
  const [sport, setSport] = useState<Sport>(initialSport);
  const [season, setSeason] = useState<number>(sport === 'nba' ? 2025 : 2024);
  const [date, setDate] = useState<string>('');
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string | undefined>('line');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const debouncedSetSearch = useMemo(() => debounce((v: string) => setSearch(v), 300), []);

  const { data, loading } = usePropsQuery({
    league: sport,
    season,
    date,
    week,
    search,
    page,
    pageSize: 50,
    sortBy,
    sortDir,
  });

  const onAddLeg = (prop: PropData) => {
    console.log('add to slip', prop);
  };

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <div className="flex gap-1">
          <button
            onClick={() => { setSport('nba'); setSeason(2025); }}
            className={`px-3 py-1 rounded ${sport === 'nba' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-300'}`}
          >
            NBA
          </button>
          <button
            onClick={() => { setSport('nfl'); setSeason(2024); }}
            className={`px-3 py-1 rounded ${sport === 'nfl' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-300'}`}
          >
            NFL
          </button>
        </div>
        <input
          placeholder="Search player or matchup"
          onChange={(e) => debouncedSetSearch(e.target.value)}
          className="px-3 py-2 rounded bg-white/5 text-sm text-white"
        />
      </div>

      <div className="bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl">
        <PropsTable data={data} isLoading={loading} onAddLeg={onAddLeg} />
      </div>
    </div>
  );
}
