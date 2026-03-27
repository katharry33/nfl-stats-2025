'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { PropDoc } from '@/lib/types';

interface PropsTableProps {
  data: PropDoc[];
  isLoading: boolean;
  view: 'table' | 'card';
  onViewData: (p: PropDoc) => void;
}

export function PropsTable({ data, isLoading, view, onViewData }: PropsTableProps) {
  if (isLoading) {
    return <div className="text-center text-zinc-500 text-xs py-10">Loading props…</div>;
  }

  if (!data.length) {
    return <div className="text-center text-zinc-500 text-xs py-10">No props found.</div>;
  }

  // Helpers
  const fmt = (v: any, d = 1) => (v == null ? '—' : isNaN(Number(v)) ? '—' : Number(v).toFixed(d));
  const fmtPct = (v: any) => (v == null ? '—' : `${(Number(v) * 100).toFixed(0)}%`);
  const fmtRaw = (v: any) => (v == null ? '—' : isNaN(Number(v)) ? '—' : Number(v));

  const capWords = (s: string) =>
    s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const normalizeProp = (prop: string) => {
    const key = prop.toLowerCase().replace(/[^a-z]/g, '');
    const map: Record<string, string> = {
      receivingyards: 'Receiving Yards',
      receiving: 'Receiving Yards',
      rushingyards: 'Rushing Yards',
      rushing: 'Rushing Yards',
      rushyards: 'Rush Yards',
      rush: 'Rush Yards',
      passingyards: 'Passing Yards',
      passing: 'Passing Yards',
      passattempts: 'Passing Attempts',
      attempts: 'Attempts'
    };
    return map[key] || capWords(prop);
  };

  const formatMatchup = (m?: string) =>
    m ? m.replace('@', ' @ ').replace(/\s+/g, ' ').toUpperCase() : '—';

  const fmtDateFull = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : '—';

  const formatDateOrWeek = (p: PropDoc) =>
    p.league === 'nba'
      ? fmtDateFull(p.gameDate)
      : p.week != null
        ? `Week ${p.week}`
        : '—';

  // CARD VIEW
  if (view === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((p) => {
          const anyP = p as any;
          return (
            <div key={p.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="text-white font-bold text-sm">{p.player}</div>
                <button onClick={() => onViewData(p)} className="text-indigo-400 hover:text-indigo-300">
                  <Eye size={16} />
                </button>
              </div>

              <div className="text-xs text-zinc-400 uppercase tracking-widest">
                {formatMatchup(anyP.matchup)}
              </div>

              <div className="text-xs text-zinc-300">
                {normalizeProp(p.prop)} ({p.line})
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
                <div><div className="font-bold text-white">{fmt(anyP.playerAvg)}</div>AVG</div>
                <div><div className="font-bold text-white">{fmt(anyP.scoreDiff)}</div>DIFF</div>
                <div><div className="font-bold text-white">{fmtPct(anyP.modelProb)}</div>WIN%</div>
              </div>

              <div className="text-xs text-zinc-400">Actual: <span className="text-white">{fmtRaw(anyP.actual)}</span></div>
              <div className="text-xs text-zinc-400">Result: <span className="text-white">{anyP.result || 'Pending'}</span></div>
            </div>
          );
        })}
      </div>
    );
  }

  // TABLE VIEW
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5">
      <table className="min-w-full text-xs text-left text-zinc-300">
        <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-widest text-zinc-500">
          <tr>
            <th className="px-3 py-2">Date / Week</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Matchup</th>
            <th className="px-3 py-2">Prop</th>
            <th className="px-3 py-2">Avg</th>
            <th className="px-3 py-2">Diff</th>
            <th className="px-3 py-2">Win%</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((p) => {
            const anyP = p as any;
            return (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-3 py-2 text-white">{formatDateOrWeek(p)}</td>
                <td className="px-3 py-2 text-white">{p.player}</td>
                <td className="px-3 py-2">{formatMatchup(anyP.matchup)}</td>
                <td className="px-3 py-2">{normalizeProp(p.prop)} ({p.line})</td>
                <td className="px-3 py-2">{fmt(anyP.playerAvg)}</td>
                <td className="px-3 py-2">{fmt(anyP.scoreDiff)}</td>
                <td className="px-3 py-2">{fmtPct(anyP.modelProb)}</td>
                <td className="px-3 py-2">{fmtRaw(anyP.actual)}</td>
                <td className="px-3 py-2">{anyP.result || 'Pending'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => onViewData(p)} className="text-indigo-400 hover:text-indigo-300">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
