'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, query, where,
  doc, setDoc, limit, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import {
  Edit3, Save, X, Search, Users, Calendar,
  Loader2, ChevronRight, Database, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleTab } from './ScheduleTab';

// ─── Sport theming ────────────────────────────────────────────────────────────
// NFL: deep grass green  NBA: warm amber-orange
export const SPORT_THEME = {
  NFL: {
    accent:      '#4ade80',   // green-400 — not too bright, readable on dark
    accentDim:   '#16a34a',   // green-600
    accentBg:    'rgba(74,222,128,0.08)',
    accentBorder:'rgba(74,222,128,0.2)',
    accentText:  '#4ade80',
    badge:       'bg-green-900/40 text-green-400 border border-green-800/50',
    activePill:  'bg-green-600/20 text-green-400 border border-green-500/30',
    button:      'bg-green-700 hover:bg-green-600 text-white',
    icon:        '🏈',
    label:       'NFL',
  },
  NBA: {
    accent:      '#fb923c',   // orange-400 — warm, not neon
    accentDim:   '#ea580c',   // orange-600
    accentBg:    'rgba(251,146,60,0.08)',
    accentBorder:'rgba(251,146,60,0.2)',
    accentText:  '#fb923c',
    badge:       'bg-orange-900/40 text-orange-400 border border-orange-800/50',
    activePill:  'bg-orange-600/20 text-orange-400 border border-orange-500/30',
    button:      'bg-orange-700 hover:bg-orange-600 text-white',
    icon:        '🏀',
    label:       'NBA',
  },
} as const;

type Sport = keyof typeof SPORT_THEME;
type Tab   = 'registry' | 'schedule';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDataHub() {
  const [sport,   setSport]   = useState<Sport>('NFL');
  const [tab,     setTab]     = useState<Tab>('registry');
  const [season,  setSeason]  = useState(2025);

  const theme = SPORT_THEME[sport];

  // Registry
  const { players, loading: loadingPlayers, searchTerm, setSearchTerm } = usePlayerRegistry(sport);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [isSaving,      setIsSaving]      = useState(false);

  // Save player mapping
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (sport === 'NBA') {
        await setDoc(
          doc(db, 'static_nbaIdMap', editingPlayer.id),
          {
            player:           editingPlayer.playerName,
            playerName:       editingPlayer.playerName,
            team:             editingPlayer.teamAbbreviation,
            teamAbbreviation: editingPlayer.teamAbbreviation,
            bdlId:            editingPlayer.bdlId   || null,
            brid:             editingPlayer.bbrId   || null,
            bbrId:            editingPlayer.bbrId   || null,
            updatedAt:        serverTimestamp(),
          },
          { merge: true },
        );
        // Mirror to brIdMap
        if (editingPlayer.bbrId) {
          await setDoc(
            doc(db, 'static_brIdMap', editingPlayer.playerName),
            { player: editingPlayer.playerName, brid: editingPlayer.bbrId, updatedAt: new Date().toISOString() },
            { merge: true },
          );
        }
      } else {
        await setDoc(
          doc(db, 'static_pfrIdMap', editingPlayer.id),
          {
            player: editingPlayer.playerName,
            pfrid:  editingPlayer.pfrid  || '',
            bdlId:  editingPlayer.bdlId  || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
      toast.success('Registry updated');
      setEditingPlayer(null);
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
    setIsSaving(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060606] text-white">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{theme.icon}</span>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter">
                <span style={{ color: theme.accent }}>{sport}</span>
                {' '}
                <span className="text-white">Data Hub</span>
              </h1>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
              Registry & Schedule Management
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Season */}
            <div className="flex items-center gap-2 bg-[#111] border border-white/8 rounded-xl px-3 py-2">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Season</span>
              <select
                value={season}
                onChange={e => setSeason(Number(e.target.value))}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                style={{ color: theme.accent }}
              >
                <option value={2023}>23-24</option>
                <option value={2024}>24-25</option>
                <option value={2025}>25-26</option>
              </select>
            </div>

            {/* Sport toggle */}
            <div className="flex bg-[#111] border border-white/8 rounded-xl p-1 gap-1">
              {(['NFL', 'NBA'] as Sport[]).map(s => {
                const t = SPORT_THEME[s];
                const active = sport === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setSport(s); setTab('registry'); }}
                    className="px-5 py-2 rounded-lg text-xs font-black transition-all"
                    style={active
                      ? { backgroundColor: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}` }
                      : { color: '#64748b', border: '1px solid transparent' }
                    }
                  >
                    {t.icon} {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0">
            {([
              { key: 'registry', label: 'Player Registry', icon: Users },
              { key: 'schedule', label: 'Schedule',        icon: Calendar },
            ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] border-b-2 transition-all"
                  style={active
                    ? { borderBottomColor: theme.accent, color: theme.accent }
                    : { borderBottomColor: 'transparent', color: '#475569' }
                  }
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* REGISTRY TAB */}
        {tab === 'registry' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                {players.length} players
              </p>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search players..."
                  className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none w-56 placeholder:text-slate-700 transition-all"
                  style={{ ['--tw-ring-color' as any]: theme.accent }}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0a0a0a' }}
            >
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Player</th>
                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Team</th>
                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">BDL ID</th>
                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">
                      {sport === 'NFL' ? 'PFR ID' : 'BBR ID'}
                    </th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {loadingPlayers ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Loading registry...</span>
                        </div>
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-700">
                        No players found
                      </td>
                    </tr>
                  ) : (
                    players.map(p => (
                      <tr
                        key={p.id}
                        className="border-t border-white/4 group transition-colors"
                        style={{ ['--tw-bg-opacity' as any]: '1' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.accentBg)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="px-5 py-4 font-bold">{p.playerName}</td>
                        <td className="px-5 py-4">
                          <span
                            className="px-2 py-1 rounded text-[10px] font-black"
                            style={{ backgroundColor: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}
                          >
                            {p.teamAbbreviation || 'UNK'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono" style={{ color: theme.accent }}>
                          {p.bdlId || <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500 italic">
                          {(sport === 'NFL' ? p.pfrid : p.bbrId) || <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setEditingPlayer(p)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            style={{ color: theme.accent, backgroundColor: theme.accentBg }}
                          >
                            <Edit3 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <ScheduleTab sport={sport} season={season} theme={theme} />
        )}
      </div>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleSave}
            className="bg-[#0f0f0f] border rounded-2xl w-full max-w-sm shadow-2xl p-8 space-y-6"
            style={{ borderColor: theme.accentBorder }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  className="text-lg font-black italic uppercase tracking-tighter"
                  style={{ color: theme.accent }}
                >
                  Edit {sport} Mapping
                </h2>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-0.5">
                  Update player IDs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="text-slate-600 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Player name (read-only) */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1 block mb-1.5">
                Player
              </label>
              <div className="bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm font-bold text-slate-400">
                {editingPlayer.playerName}
              </div>
            </div>

            {/* ID fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1 block mb-1.5">
                  BDL ID
                </label>
                <input
                  value={editingPlayer.bdlId || ''}
                  onChange={e => setEditingPlayer({ ...editingPlayer, bdlId: e.target.value })}
                  placeholder="numeric"
                  className="w-full bg-black/40 border border-white/8 rounded-xl px-3 py-3 font-mono text-xs outline-none transition-all"
                  style={{ color: theme.accent }}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1 block mb-1.5">
                  {sport === 'NFL' ? 'PFR ID' : 'BBR ID'}
                </label>
                <input
                  value={sport === 'NFL' ? (editingPlayer.pfrid || '') : (editingPlayer.bbrId || '')}
                  onChange={e => setEditingPlayer(
                    sport === 'NFL'
                      ? { ...editingPlayer, pfrid: e.target.value }
                      : { ...editingPlayer, bbrId: e.target.value }
                  )}
                  placeholder={sport === 'NFL' ? 'e.g. BradTo00' : 'e.g. jamesle01'}
                  className="w-full bg-black/40 border border-white/8 rounded-xl px-3 py-3 font-mono text-xs outline-none text-white transition-all"
                  onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: theme.accentDim, color: 'white' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.accent, e.currentTarget.style.color = '#000')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = theme.accentDim, e.currentTarget.style.color = 'white')}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Mapping
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
