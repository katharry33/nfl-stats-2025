import { ColumnDef } from '@tanstack/react-table';
import { PropData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<PropData>[] = [
  // 1. PLAYER & TEAM
  {
    accessorKey: 'player',
    header: 'Player',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            src={row.original.team} 
            alt="team" 
            className="w-8 h-8 rounded-full bg-black/20 border border-white/10 p-1" 
          />
          {row.original.valueIcon && (
            <span className="absolute -top-1 -right-1 text-[10px]">{row.original.valueIcon}</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-sm whitespace-nowrap">{row.getValue('player')}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
            {row.original.matchup}
          </span>
        </div>
      </div>
    ),
  },

  // 2. PROP & LINE COMBO
  {
    id: 'propLine',
    header: 'Prop / Line',
    accessorFn: (row) => `${row.prop} ${row.line}`,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-400 font-bold uppercase">{row.original.prop}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black uppercase ${row.original.overUnder.toLowerCase() === 'over' ? 'text-indigo-400' : 'text-orange-400'}`}>
            {row.original.overUnder}
          </span>
          <span className="text-sm font-black text-white">{row.original.line}</span>
        </div>
      </div>
    ),
  },

  // 3. ODDS & EDGE
  {
    accessorKey: 'odds',
    header: 'Odds',
    cell: ({ getValue }) => {
      const val = getValue() as number;
      return (
        <Badge variant="outline" className="font-mono bg-black/40 border-white/5 text-zinc-300">
          {val > 0 ? `+${val}` : val}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'bestEdgePct',
    header: 'Edge %',
    cell: ({ getValue }) => {
      const val = (getValue() as number) * 100;
      return (
        <span className={`font-black text-sm ${val > 15 ? 'text-emerald-400' : 'text-emerald-400/60'}`}>
          {val.toFixed(1)}%
        </span>
      );
    },
  },

  // 4. NBA PACE (Conditional)
  {
    accessorKey: 'pace',
    header: 'Pace',
    cell: ({ getValue }) => {
      const val = getValue() as number;
      if (!val) return <span className="text-zinc-700">-</span>;
      return <span className="text-orange-400/80 font-mono text-xs">{val.toFixed(1)}</span>;
    },
  },

  // 5. PROBABILITY & EV
  {
    accessorKey: 'winProbability',
    header: 'Win Prob',
    cell: ({ getValue }) => {
      const val = (getValue() as number) * 100;
      return (
        <div className="flex flex-col gap-1 w-16">
          <span className="text-[10px] font-bold text-zinc-400">{val.toFixed(0)}%</span>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${val}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'expectedValue',
    header: 'EV',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-indigo-300 font-bold">
        +${(getValue() as number).toFixed(2)}
      </span>
    ),
  },

  // 6. CONFIDENCE SCORE
  {
    accessorKey: 'confidenceScore',
    header: 'Conf',
    cell: ({ getValue }) => {
      const score = getValue() as number;
      return (
        <div className={`text-xs font-black px-2 py-1 rounded border ${score > 75 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'}`}>
          {score?.toFixed(0)}
        </div>
      );
    }
  }
];