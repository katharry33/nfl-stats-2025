import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react" 
import { CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeMatchup(matchup: string): string {
  if (!matchup) return "";
  return matchup.toUpperCase().replace(/\s+/g, "");
}
export const fmt = (val: any) => {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const fmtPct = (val: any) => {
  if (val == null || isNaN(val)) return '0%';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  const final = num <= 1 ? num * 100 : num;
  return `${Math.round(final)}%`;
}

export const formatBetDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Ensure these are exported as components
export const ScoreDiff = ({ v }: { v: any }) => {
  const num = parseFloat(v);
  if (isNaN(num)) return <span>—</span>;
  const color = num > 0 ? "text-emerald-400" : num < 0 ? "text-red-400" : "text-slate-500";
  return <span className={`font-mono font-bold ${color}`}>{num > 0 ? `+${num}` : num}</span>;
};
export function ResultBadge({ v }: { v: any }) {
  const res = String(v || '').toLowerCase();
  
  // Logic for different statuses
  const isWin = res.includes('won') || res.includes('hit') || res.includes('over');
  const isLoss = res.includes('lost') || res.includes('miss') || res.includes('under');
  const isPush = res.includes('push') || res.includes('void');

  if (isWin) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.05)]">
        <CheckCircle2 size={10} strokeWidth={3} />
        Hit
      </div>
    );
  }

  if (isLoss) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-400/5 border border-rose-400/10 text-rose-300/70 text-[9px] font-black uppercase tracking-widest">
        <XCircle size={10} strokeWidth={3} />
        Miss
      </div>
    );
  }

  if (isPush) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/5 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
        <MinusCircle size={10} strokeWidth={3} />
        Push
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
      <Clock size={10} strokeWidth={3} />
      Pending
    </div>
  );
}

export function formatTimestamp(date: string | Date | any) {
  if (!date) return '—';
  // If it's a Firestore timestamp (has seconds)
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
