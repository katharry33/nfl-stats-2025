'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { IngestEnrichModal } from '@/components/modals/EnrichModal';
import { usePropsQuery } from '@/hooks/usePropsQuery';
import { toast } from 'sonner';
import { Database, CheckCircle2, PlusCircle, X, Save } from 'lucide-react';
import { PropsTable } from '@/components/bets/PropsTable';
import { PropDoc } from '@/lib/types';
import { adminDb } from '@/lib/firebase/admin'; // only used server-side; client uses fetch

// ─── Manual Add / Edit Modal ──────────────────────────────────────────────────

interface PropFormData {
  player: string;
  team: string;
  prop: string;
  line: string;
  overUnder: 'Over' | 'Under';
  matchup: string;
  gameDate: string;
  odds: string;
  season: string;
}

const EMPTY_FORM: PropFormData = {
  player: '',
  team: '',
  prop: '',
  line: '',
  overUnder: 'Over',
  matchup: '',
  gameDate: new Date().toISOString().split('T')[0],
  odds: '',
  season: '2025',
};

function PropFormModal({
  open,
  initial,
  league,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Partial<PropDoc>;
  league: 'nba' | 'nfl';
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<PropFormData>(() => ({
    player: initial?.player ?? '',
    team: initial?.team ?? '',
    prop: initial?.prop ?? '',
    line: String(initial?.line ?? ''),
    overUnder: (initial?.overUnder as 'Over' | 'Under') ?? 'Over',
    matchup: initial?.matchup ?? '',
    gameDate: initial?.gameDate ?? new Date().toISOString().split('T')[0],
    odds: String(initial?.odds ?? ''),
    season: String(initial?.season ?? '2025'),
  }));
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function field(k: keyof PropFormData, value: string) {
    setForm((f) => ({ ...f, [k]: value }));
  }

  async function handleSave() {
    if (!form.player || !form.prop || !form.line) {
      toast.error('Player, prop, and line are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        line: parseFloat(form.line),
        odds: form.odds ? parseInt(form.odds, 10) : null,
        season: parseInt(form.season, 10),
        league,
        id: initial?.id,
      };
      const res = await fetch(`/api/props/manual`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Save failed');
      }
      toast.success(isEdit ? 'Prop updated' : 'Prop added');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-[28px] w-full max-w-lg shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black italic uppercase tracking-tighter">
            {isEdit ? 'Edit' : 'Add'} <span className="text-indigo-400">Prop</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['player', 'Player Name', 'text', 'col-span-2'],
              ['matchup', 'Matchup (e.g. DET @ NOP)', 'text', 'col-span-2'],
              ['prop', 'Prop Type (e.g. points)', 'text', ''],
              ['line', 'Line (e.g. 22.5)', 'number', ''],
              ['odds', 'Odds (e.g. -115)', 'number', ''],
              ['gameDate', 'Game Date', 'date', ''],
              ['team', 'Team Abbrev.', 'text', ''],
              ['season', 'Season Start Year', 'number', ''],
            ] as [keyof PropFormData, string, string, string][]
          ).map(([key, label, type, span]) => (
            <div key={key} className={span || ''}>
              <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => field(key, e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          ))}

          {/* Over/Under toggle */}
          <div>
            <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
              Over / Under
            </label>
            <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10">
              {(['Over', 'Under'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => field('overUnder', v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    form.overUnder === v
                      ? 'bg-indigo-500 text-white'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs font-black uppercase transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Prop'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  prop,
  league,
  season,
  onClose,
  onDeleted,
}: {
  prop: PropDoc;
  league: 'nba' | 'nfl';
  season: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/props/manual?id=${prop.id}&league=${league}&season=${season}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Delete failed');
      }
      toast.success('Prop deleted');
      onDeleted();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-[24px] p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="text-sm font-black uppercase text-red-400">Delete Prop?</h3>
        <p className="text-xs text-zinc-400">
          This will permanently delete{' '}
          <span className="text-white font-bold">{prop.player}</span> —{' '}
          <span className="text-indigo-300">{prop.prop} {prop.line}</span>.
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 text-xs font-black uppercase hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-black uppercase hover:bg-red-600/30 transition-all disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoricalVaultPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [season, setSeason] = useState(2025);
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editProp, setEditProp] = useState<PropDoc | null>(null);
  const [deleteProp, setDeleteProp] = useState<PropDoc | null>(null);

  const { data, loading, hasMore, loadMore, refetch } = usePropsQuery({
    league,
    season,
    week: league === 'nfl' ? selectedWeek : undefined,
    date: league === 'nba' ? selectedDate : undefined,
  });

  const today = new Date().toISOString().split('T')[0];

  const handleGradeSlate = async () => {
    try {
      const res = await fetch(`/api/${league}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, week: selectedWeek, season }),
      });
      if (!res.ok) throw new Error('Grading protocol failed');
      toast.success('Protocol Success', { description: 'Vault records updated.' });
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    }
  };

  const handleAdd = useCallback((p: PropDoc) => {
    toast.info(`${p.player} added to slip`);
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-[#121214] p-8 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              Historical <span className="text-indigo-500">Vault</span>
            </h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
              Intel Archive • {league.toUpperCase()} Protocol
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* League toggle */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
              {(['nba', 'nfl'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLeague(l);
                    setSeason(l === 'nba' ? 2025 : 2024);
                  }}
                  className={`px-8 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    league === l ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {league === 'nba' && selectedDate === today && (
          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-indigo-400">
              You are viewing today's slate. Use the Bet Builder for live analysis.
            </p>
            <Link
              href="/bet-builder"
              className="text-[10px] bg-indigo-500 hover:bg-indigo-400 px-3 py-1 rounded-lg font-black uppercase transition-colors"
            >
              Go to Builder →
            </Link>
          </div>
        )}
      </div>

      {/* Filters & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Date / Week + Season */}
        <div className="lg:col-span-2 flex gap-3 bg-[#121214] p-4 rounded-[24px] border border-white/5">
          {league === 'nba' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none focus:border-indigo-500/50"
            />
          ) : (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none"
            >
              {Array.from({ length: 22 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </select>
          )}
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
          >
            {league === 'nfl' && <option value={2024}>2024-25</option>}
            <option value={2025}>2025-26</option>
          </select>
        </div>

        {/* Add Prop */}
        <button
          onClick={() => setAddOpen(true)}
          className="bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 text-zinc-300 hover:text-white p-4 rounded-[24px] font-black italic uppercase flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
        >
          <PlusCircle size={18} className="text-indigo-400" /> Add Prop
        </button>

        {/* Sync */}
        <button
          onClick={() => setIsIngestOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-[24px] font-black italic uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-900/20 text-sm"
        >
          <Database size={18} /> Sync Market Data
        </button>

        {/* Grade */}
        <button
          onClick={handleGradeSlate}
          className="bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-500 p-4 rounded-[24px] font-black italic uppercase transition-all flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle2 size={18} /> Grade Slate
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#121214]/60 rounded-[28px] border border-white/5 overflow-hidden min-h-[400px]">
        <PropsTable
          data={data}
          isLoading={loading}
          onAddLeg={handleAdd}
          onEdit={(p: PropDoc) => setEditProp(p)}
          onDelete={(p: PropDoc) => setDeleteProp(p)}
          onLoadMore={loadMore}
          hasMore={hasMore}
          variant="historical-vault"
        />
      </div>

      {/* Modals */}
      <IngestEnrichModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onComplete={() => refetch()}
        league={league}
        defaultDate={selectedDate}
        defaultSeason={season}
        props={data}
      />

      <PropFormModal
        open={addOpen}
        league={league}
        onClose={() => setAddOpen(false)}
        onSaved={() => refetch()}
      />

      {editProp && (
        <PropFormModal
          open={true}
          initial={editProp}
          league={league}
          onClose={() => setEditProp(null)}
          onSaved={() => { refetch(); setEditProp(null); }}
        />
      )}

      {deleteProp && (
        <DeleteConfirmModal
          prop={deleteProp}
          league={league}
          season={season}
          onClose={() => setDeleteProp(null)}
          onDeleted={() => { refetch(); setDeleteProp(null); }}
        />
      )}
    </div>
  );
}