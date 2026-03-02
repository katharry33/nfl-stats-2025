'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Hash, Plus, Upload, Trash2, X, Check } from 'lucide-react';

type PfrEntry = { id: string; player: string; pfrid: string };

export default function PfrIdsPage() {
  const [data, setData]           = useState<PfrEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newName, setNewName]     = useState('');
  const [newPfr, setNewPfr]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/static-data/pfr-ids')
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newPfr.trim()) return;
    setSaving(true);
    await fetch('/api/static-data/pfr-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: newName, pfrId: newPfr }),
    });
    setNewName(''); setNewPfr(''); setShowAdd(false); setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/static-data/pfr-ids', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteId(null);
    fetchData();
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg('');
    const text  = await file.text();
    const rows  = text.split('\n').filter(Boolean).slice(1);
    let count   = 0;
    for (const line of rows) {
      const [playerName, pfrId] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (playerName && pfrId) {
        await fetch('/api/static-data/pfr-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, pfrId }),
        });
        count++;
      }
    }
    setUploadMsg(`✓ Imported ${count} entries`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#060606] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl flex items-center justify-center">
            <Hash className="h-4 w-4 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">PFR ID Map</h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
              Static Data · {data.length} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadMsg && <span className="text-[10px] text-emerald-400 font-mono font-bold">{uploadMsg}</span>}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-black text-zinc-400 uppercase tracking-widest cursor-pointer transition-colors">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 rounded-xl text-xs font-black text-[#FFD700] uppercase tracking-widest transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Manual
          </button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-700 font-mono">
        CSV format: <span className="text-zinc-500">playerName,pfrId</span> — first row treated as header and skipped
      </p>

      {/* Manual Add Form */}
      {showAdd && (
        <div className="bg-[#0f1115] border border-[#FFD700]/20 rounded-2xl p-5 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-1.5">Player Name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Patrick Mahomes"
              className="w-full bg-[#060606] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-1.5">PFR ID</label>
            <input
              value={newPfr} onChange={e => setNewPfr(e.target.value)}
              placeholder="e.g. MahoPa00"
              className="w-full bg-[#060606] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleAdd} disabled={saving || !newName.trim() || !newPfr.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FFD700] hover:bg-[#FFD700]/90 disabled:opacity-40 rounded-xl text-xs font-black text-black uppercase tracking-widest transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewPfr(''); }}
              className="p-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl text-zinc-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full">
          <thead className="border-b border-white/[0.06]">
            <tr>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Player Name</th>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">PFR ID</th>
              <th className="px-5 py-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-[#FFD700] mx-auto" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="py-16 text-center text-zinc-600 text-sm">No entries yet. Add manually or upload a CSV.</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-3 text-sm font-bold text-white italic uppercase tracking-tight">{item.player}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-black text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-2.5 py-1 rounded-lg font-mono tracking-widest">
                    {item.pfrid}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {deleteId === item.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleDelete(item.id)} className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-lg uppercase tracking-widest hover:bg-red-400/20 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteId(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}