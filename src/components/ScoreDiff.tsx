'use client';

import React from 'react';

export function ScoreDiff({ v }: { v: any }) {
  const value = Number(v);

  if (v === null || v === undefined || isNaN(value)) {
    return <span className="text-zinc-700 font-black">—</span>;
  }

  const isPositive = value > 0;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black tabular-nums ${
        isPositive
          ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/80'
          : 'bg-rose-400/5 border-rose-400/10 text-rose-300/60'
      }`}
    >
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}</span>
    </div>
  );
}
