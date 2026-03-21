// ScheduleTab.tsx
// Drop this into AdminDataHub as the schedule tab content.
// Replace the existing schedule tab JSX with this component.
// Props: sport, season, theme

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, query, where,
  limit, startAfter, orderBy, DocumentSnapshot,
} from 'firebase/firestore';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleTabProps {
  sport:  'NFL' | 'NBA';
  season: number;
  theme:  {
    accent:       string;
    accentBg:     string;
    accentBorder: string;
  };
}

interface Game {
  id:          string;
  gameDate?:   string;
  date?:       string;
  week?:       number | string;
  homeTeam?:   string;
  home_team?:  string;
  awayTeam?:   string;
  away_team?:  string;
  visitorTeam?:string;
  homeScore?:  number;
  visitorScore?:number;
  status?:     string;
}

const PAGE_SIZE = 50;

function formatDate(raw: any): string {
  if (!raw) return '—';
  const s = typeof raw === 'string' ? raw : raw?.toDate?.()?.toISOString() ?? '';
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00Z');
  return isNaN(d.getTime())
    ? s.split('T')[0]
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' });
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-700 text-[9px] font-black">—</span>;
  const s = status.toLowerCase();
  const cls =
    s === 'final' || s === 'closed'
      ? 'bg-slate-800 text-slate-400 border border-slate-700'
      : s === 'live' || s === 'inprogress'
      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
      : 'bg-blue-900/30 text-blue-400 border border-blue-800/40';
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${cls}`}>
      {s === 'closed' ? 'FINAL' : status.toUpperCase()}
    </span>
  );
}

export function ScheduleTab({ sport, season, theme }: ScheduleTabProps) {
  const [games,    setGames]    = useState<Game[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [allGames, setAllGames] = useState<Game[]>([]); // in-memory for client search/paginate

  const getCollections = (): string[] => {
    if (sport === 'NBA') return ['static_nba_schedule'];
    return ['static_schedule', 'static_nfl_schedule']; // try both
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const accumulated: Game[] = [];

    for (const colName of getCollections()) {
      try {
        const q = query(
          collection(db, colName),
          where('season', 'in', [season, String(season)]),
          limit(500),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.docs.forEach(d => accumulated.push({ id: d.id, ...d.data() as any }));
          break; // found data — stop
        }
      } catch { /* collection might not exist */ }
    }

    // Sort
    accumulated.sort((a, b) => {
      if (sport === 'NFL') {
        const wa = Number(a.week ?? 0), wb = Number(b.week ?? 0);
        if (wa !== wb) return wb - wa; // newest week first
      }
      const da = a.gameDate ?? a.date ?? '';
      const db_ = b.gameDate ?? b.date ?? '';
      return String(db_).localeCompare(String(da));
    });

    setAllGames(accumulated);
    setTotal(accumulated.length);
    setLoading(false);
  }, [sport, season]);

  useEffect(() => { fetchAll(); setPage(0); setSearch(''); }, [fetchAll]);

  // Filter + paginate in memory
  const filtered = allGames.filter(g => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const home   = (g.homeTeam ?? g.home_team ?? '').toLowerCase();
    const away   = (g.awayTeam ?? g.away_team ?? g.visitorTeam ?? '').toLowerCase();
    const date   = (g.gameDate ?? g.date ?? '').toLowerCase();
    return home.includes(s) || away.includes(s) || date.includes(s);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageGames  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          {filtered.length} games · {season}
        </p>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search teams or date..."
              className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs outline-none w-52 placeholder:text-slate-700 transition-all"
              onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0a0a0a' }}>
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                {sport === 'NFL' ? 'Week' : 'Date'}
              </th>
              <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600">Matchup</th>
              {sport === 'NFL' && (
                <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600">Date</th>
              )}
              <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600 text-center">Score</th>
              <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Loader2 size={13} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Loading schedule...</span>
                  </div>
                </td>
              </tr>
            ) : pageGames.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-700">
                  {search ? `No games matching "${search}"` : `No schedule data for ${season}`}
                </td>
              </tr>
            ) : (
              pageGames.map(game => {
                const away    = game.awayTeam ?? game.away_team ?? game.visitorTeam ?? '?';
                const home    = game.homeTeam ?? game.home_team ?? '?';
                const gameDate = game.gameDate ?? game.date ?? '';
                const hasScore = game.homeScore != null && game.visitorScore != null;

                return (
                  <tr
                    key={game.id}
                    className="border-t border-white/4 transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.accentBg)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-5 py-3.5 font-mono text-[10px]" style={{ color: theme.accent }}>
                      {sport === 'NFL'
                        ? (game.week ? `WK ${game.week}` : '—')
                        : formatDate(gameDate)
                      }
                    </td>
                    <td className="px-5 py-3.5 font-bold">
                      <span className="text-slate-400">{away}</span>
                      <span className="text-slate-700 mx-2">@</span>
                      <span className="text-white">{home}</span>
                    </td>
                    {sport === 'NFL' && (
                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-600">
                        {formatDate(gameDate)}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-center font-mono text-[10px]">
                      {hasScore
                        ? <span style={{ color: theme.accent }}>{game.visitorScore} – {game.homeScore}</span>
                        : <span className="text-slate-700">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={game.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 bg-[#111] border border-white/8 rounded-xl text-slate-500 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i : Math.min(Math.max(page - 2, 0), totalPages - 5) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-[10px] font-black transition-all"
                    style={page === p
                      ? { backgroundColor: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}` }
                      : { color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 bg-[#111] border border-white/8 rounded-xl text-slate-500 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}