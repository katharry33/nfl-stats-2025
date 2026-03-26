
import React from 'react';
import { NormalizedProp } from '@/hooks/useAllProps';

interface Column {
  key: keyof NormalizedProp | 'actions';
  label: string;
  fmt?: (value: any, prop?: NormalizedProp) => React.ReactNode;
  color?: (value: any, prop?: NormalizedProp) => string;
}

export const ALL_COLS: Column[] = [
  {
    key: 'brid',
    label: 'ID Status',
    fmt: v => v ? '✅' : '❌ MISSING',
    color: v => v ? 'text-emerald-500' : 'text-red-500 font-bold'
  },
  { key: 'league', label: 'League' },
  { key: 'player', label: 'Player' },
  { key: 'prop', label: 'Prop' },
  {
    key: 'playerAvg', 
    label: 'Avg', 
    fmt: v => v?.toFixed(1) ?? 'N/A',
    color: (v, prop) => {
      if (v === 0 || v == null) return 'text-red-500 font-black animate-pulse'; 
      return 'text-zinc-300';
    }
  },
  { key: 'line', label: 'Line' },
  { key: 'bestOdds', label: 'Odds' },
  { key: 'bestBook', label: 'Book' },
  { key: 'matchup', label: 'Matchup' },
];

interface BetBuilderTableProps {
  data: NormalizedProp[];
  columns: Column[];
}

const BetBuilderTable: React.FC<BetBuilderTableProps> = ({ data, columns }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-700">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data.map(row => (
            <tr key={row.id}>
              {columns.map(col => {
                const value = row[col.key as keyof NormalizedProp];
                const formattedValue = col.fmt ? col.fmt(value, row) : value as any;
                const colorClass = col.color ? col.color(value, row) : '';

                return (
                  <td key={col.key} className={`px-4 py-3 whitespace-nowrap text-sm ${colorClass}`}>
                    {formattedValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BetBuilderTable;
