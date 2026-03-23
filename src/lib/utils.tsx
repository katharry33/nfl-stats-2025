import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react" 

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

export const ResultBadge = ({ v }: { v: any }) => {
  if (!v) return <span className="text-slate-600 font-black italic uppercase text-[10px]">Pending</span>;
  const val = String(v).toLowerCase();
  const isHit = val === 'hit' || val === 'over' || val === 'won';
  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
      isHit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`}>
      {v}
    </span>
  );
};