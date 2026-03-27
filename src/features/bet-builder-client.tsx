'use client';

import React, { useState, useMemo } from 'react';
import { PropsTable } from '@/components/bets/PropsTable';
import { PropDoc } from '@/lib/types';
import { PropCardView } from '@/components/PropCardView';

export default function BetBuilderClient({
  initialData,
  league,
}: {
  initialData: PropDoc[];
  league: 'nba' | 'nfl';
}) {
  const [search, setSearch] = useState('');

  // No more hydrateProp — your ingestion already writes clean PropDocs
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return initialData.filter((p) => {
      const name = p.player?.toLowerCase() ?? '';
      return name.includes(q) && p.league === league;
    });
  }, [initialData, search, league]);

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search players..."
        className="p-2 border rounded"
      />

      <PropsTable data={filteredData} onAddLeg={() => {}} />

      <div className="grid grid-cols-1 gap-4">
        {filteredData.map((p) => (
          <PropCardView key={p.id} prop={p} onAddLeg={() => {}} />
        ))}
      </div>
    </div>
  );
}
