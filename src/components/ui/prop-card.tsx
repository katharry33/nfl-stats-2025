'use client';

import type { PropData } from '@/lib/types';

// src/components/ui/prop-card.tsx
export function PropCard({ prop }: { prop: PropData }) {
  return (
    <div className="dark bg-[#0f1115] border border-white/5 p-6 rounded-3xl shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-black text-xl uppercase italic tracking-tighter leading-none">
            {prop.player}
          </h3>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-2">
            {prop.matchup}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
          <span className="text-[10px] font-black text-primary uppercase">WK {prop.week}</span>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center mb-4">
        <span className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-1">Target Line</span>
        <div className="text-4xl font-black text-white tabular-nums tracking-tighter">
          {prop.line}
        </div>
      </div>

      <p className="text-[10px] text-center text-zinc-500 font-bold uppercase tracking-widest">
        {prop.team} • {prop.prop}
      </p>
    </div>
  );
}
