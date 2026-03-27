'use client';

import React, { useState, useMemo } from 'react';
import { PropsTable } from '@/components/PropsTable';
import { PropCardView } from '@/components/PropCardView';
import { PropDoc } from '@/lib/types';

export default function BetBuilderClient({
  initialData,
  league,
}: {
  initialData: PropDoc[];
  league: 'nba' | 'nfl';
}) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [sort, setSort] = useState<'none' | 'prob' | 'ev' | 'edge' | 'hit'>(
    'none'
  );
  const [propType, setPropType] = useState<string>('all');
  const [slip, setSlip] = useState<PropDoc[]>([]);

  // Add/remove legs
  function addLeg(p: PropDoc) {
    if (!slip.find((l) => l.id === p.id)) {
      setSlip([...slip, p]);
    }
  }

  function removeLeg(id: string) {
    setSlip(slip.filter((l) => l.id !== id));
  }

  // Filtering + sorting
  const filteredData = useMemo(() => {
    let data = initialData.filter((p) => p.league === league);

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((p) =>
        (p.player ?? '').toLowerCase().includes(q)
      );
    }

    // Prop type filter
    if (propType !== 'all') {
      data = data.filter((p) => p.prop.toLowerCase().includes(propType));
    }

    // Sorting
    if (sort === 'prob') {
      data = [...data].sort(
        (a, b) => (b.modelProb ?? 0) - (a.modelProb ?? 0)
      );
    } else if (sort === 'ev') {
      data = [...data].sort(
        (a, b) => (b.expectedValue ?? 0) - (a.expectedValue ?? 0)
      );
    } else if (sort === 'edge') {
      data = [...data].sort(
        (a, b) => (b.bestEdge ?? 0) - (a.bestEdge ?? 0)
      );
    } else if (sort === 'hit') {
      data = [...data].sort(
        (a, b) => (b.seasonHitPct ?? 0) - (a.seasonHitPct ?? 0)
      );
    }

    return data;
  }, [initialData, league, search, propType, sort]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="p-2 border rounded bg-zinc-900 text-zinc-200"
        />

        <select
          value={propType}
          onChange={(e) => setPropType(e.target.value)}
          className="p-2 border rounded bg-zinc-900 text-zinc-200"
        >
          <option value="all">All Props</option>
          <option value="points">Points</option>
          <option value="rebounds">Rebounds</option>
          <option value="assists">Assists</option>
          <option value="yards">Yards</option>
          <option value="touchdowns">Touchdowns</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="p-2 border rounded bg-zinc-900 text-zinc-200"
        >
          <option value="none">Sort: None</option>
          <option value="prob">Win Probability</option>
          <option value="ev">Expected Value</option>
          <option value="edge">Best Edge</option>
          <option value="hit">Season Hit%</option>
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1 rounded ${
              view === 'table'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-1 rounded ${
              view === 'cards'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Betslip */}
      {slip.length > 0 && (
        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl">
          <div className="text-xs font-bold text-zinc-400 mb-2">
            Bet Slip ({slip.length})
          </div>

          <div className="space-y-2">
            {slip.map((leg) => (
              <div
                key={leg.id}
                className="flex justify-between items-center text-sm text-zinc-300"
              >
                <span>
                  {leg.player} — {leg.prop} {leg.line} ({leg.overUnder})
                </span>
                <button
                  onClick={() => removeLeg(leg.id)}
                  className="text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View */}
      {view === 'table' ? (
        <PropsTable data={filteredData} onAddLeg={addLeg} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((p) => (
            <PropCardView key={p.id} prop={p} onAddLeg={addLeg} />
          ))}
        </div>
      )}
    </div>
  );
}
