'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';

export function ResultBadge({ v }: { v: any }) {
  const res = String(v || '').toLowerCase();
  
  const isWin = res.includes('won') || res.includes('hit') || res.includes('over');
  const isLoss = res.includes('lost') || res.includes('miss') || res.includes('under');
  const isPush = res.includes('push') || res.includes('void');

  if (isWin) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.05)]">
        <CheckCircle2 size={10} strokeWidth={3} />
        Hit
      </div>
    );
  }

  if (isLoss) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-400/5 border border-rose-400/10 text-rose-300/60 text-[9px] font-black uppercase tracking-widest">
        <XCircle size={10} strokeWidth={3} />
        Miss
      </div>
    );
  }

  if (isPush) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 border border-white/5 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
        <MinusCircle size={10} strokeWidth={3} />
        Push
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
      <Clock size={10} strokeWidth={3} />
      Pending
    </div>
  );
}