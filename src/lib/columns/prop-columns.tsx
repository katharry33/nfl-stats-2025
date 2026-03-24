
import { ColumnDef } from '@tanstack/react-table';
import { User, MapPin } from 'lucide-react';

export const getVaultColumns = (league: 'nba' | 'nfl'): ColumnDef<any>[] => [
  {
    id: 'playerName',
    accessorKey: 'playerName',
    header: 'Player',
    enableSorting: true,
    enableHiding: false, // Player should always be visible
    cell: ({ row }) => {
      const p = row.original;
      const name = p.playerName || p.player || 'Unknown';
      
      // Clean up Matchup (Remove leading hyphens)
      let matchup = p.matchup || '';
      if (matchup.startsWith('-')) matchup = matchup.substring(1).trim();

      return (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-lg border border-white/5">
            <User size={14} className="text-zinc-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase text-white">{name}</span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
              {matchup}
            </span>
          </div>
        </div>
      );
    }
  },
  {
    id: 'team',
    accessorKey: 'team',
    header: 'Team',
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue() as string;
      if (!val) return '—';
      // Fix NBA URL issue: Extract abbreviation from path if it's a URL
      if (val.includes('http')) {
        return val.split('/').pop()?.split('.')[0]?.toUpperCase() || val;
      }
      return val.toUpperCase();
    }
  },
  {
    id: 'prop',
    accessorKey: 'prop',
    header: 'Prop Type',
    enableSorting: true,
  },
  {
    id: 'line',
    accessorKey: 'line',
    header: 'Line',
    enableSorting: true,
    cell: ({ row }) => {
      // Access safely using optional chaining
      const lineValue = row?.original?.line;
      
      return (
        <span className="font-mono font-bold text-indigo-400">
          {lineValue !== undefined && lineValue !== null ? lineValue : '—'}
        </span>
      );
    }
  },
  {
    id: 'actualResult',
    accessorKey: 'actualResult',
    header: 'Actual',
    enableSorting: true,
    cell: ({ row }) => {
      const resultValue = row?.original?.actualResult;
      return resultValue !== undefined && resultValue !== null ? resultValue : '—';
    }
  }
];
