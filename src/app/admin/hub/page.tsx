'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase/config';
import {
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import {
  Edit3, X, Search, Users, Calendar,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleTab } from './ScheduleTab';
import SyncDashboard from '@/components/admin/SyncDashboard';

// ─── Sport theming ────────────────────────────────────────────────────────────
export const SPORT_THEME = {
  NFL: {
    accent:      '#4ade80',
    accentDim:   '#16a34a',
    accentBg:    'rgba(74,222,128,0.08)',
    accentBorder:'rgba(74,222,128,0.2)',
    accentText:  '#4ade80',
    icon:        '🏈',
    label:       'NFL',
  },
  NBA: {
    accent:      '#fb923c',
    accentDim:   '#ea580c',
    accentBg:    'rgba(251,146,60,0.08)',
    accentBorder:'rgba(251,146,60,0.2)',
    accentText:  '#fb923c',
    icon:        '🏀',
    label:       'NBA',
  },
} as const;

type Sport = keyof typeof SPORT_THEME;
type Tab   = 'registry' | 'schedule' | 'pipeline';

export default function AdminDataHub() {
  const [sport, setSport] = useState<Sport>('NFL');
  const [tab, setTab] = useState<Tab>('registry');
  const [season, setSeason] = useState(2025);

  const theme = SPORT_THEME[sport];

  const { players, loading: loadingPlayers, searchTerm, setSearchTerm } = usePlayerRegistry(sport);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

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
            brid:             editingPlayer.bbrId || null,
            bbrId:            editingPlayer.bbrId || null,
            updatedAt:        serverTimestamp(),
          },
          { merge: true },
        );

        if (editingPlayer.bbrId) {
          await setDoc(
            doc(db, 'static_brIdMap', editingPlayer.playerName),
            {
              player: editingPlayer.playerName,
              brid: editingPlayer.bbrId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      } else {
        await setDoc(
          doc(db, 'static_pfrIdMap', editingPlayer.id),
          {
            player: editingPlayer.playerName,
            pfrid:  editingPlayer.pfrid || '',
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

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{theme.icon}</span>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter">
                <span style={{ color: theme.accent }}>{sport}</span>{' '}
                <span className="text-white">Data Hub</span>
              </h1>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
              System Management & Ingestion
            </p>
          </div>

          <div className="flex items-center gap-3">
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

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex">
            {[
              { key: 'registry', label: 'Player Registry', icon: Users },
              { key: 'schedule', label: 'Schedule', icon: Calendar },
              { key: 'pipeline', label: 'Pipeline Console', icon: Terminal },
            ].map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {tab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SyncDashboard />
            </div>
          </div>
        )}

        {tab === 'registry' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                {players.length} players
              </p>

              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search players..."
                  className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none w-56"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#0a0a0a]">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-4 text-[9px] text-slate-600">Player</th>
                    <th className="px-5 py-4 text-[9px] text-slate-600">Team</th>
                    <th className="px-5 py-4 text-[9px] text-slate-600">
                      {sport === 'NFL' ? 'PFR ID' : 'BBR ID'}
                    </th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>

                <tbody>
                  {loadingPlayers ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center text-slate-600">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    players.map(p => (
                      <tr key={p.id}>
                        <td className="px-5 py-4 font-bold">{p.playerName}</td>
                        <td className="px-5 py-4">{p.teamAbbreviation}</td>
                        <td className="px-5 py-4">
                          {(sport === 'NFL' ? p.pfrid : p.bbrId) || '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setEditingPlayer(p)}>
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

        {tab === 'schedule' && (
          <ScheduleTab sport={sport} season={season} theme={theme} />
        )}
      </div>

      {/* Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          <form onSubmit={handleSave} className="bg-[#0f0f0f] p-6 rounded-xl space-y-4">
            <button type="button" onClick={() => setEditingPlayer(null)}>
              <X />
            </button>

            <div className="grid grid-cols-1 gap-4">
              <input
                value={sport === 'NFL' ? editingPlayer.pfrid || '' : editingPlayer.bbrId || ''}
                onChange={e =>
                  setEditingPlayer(
                    sport === 'NFL'
                      ? { ...editingPlayer, pfrid: e.target.value }
                      : { ...editingPlayer, bbrId: e.target.value }
                  )
                }
              />
            </div>

            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Update'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}