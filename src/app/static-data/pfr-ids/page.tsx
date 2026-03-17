'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Hash, Plus, Upload, Trash2, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

type PfrEntry = { id: string; playerName: string; pfrId: string };

export default function PfrIdsPage() {
  const [data,      setData]      = useState<PfrEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newPfr,    setNewPfr]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r    = await fetch('/api/static-data/pfr-ids');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? 'Load failed');
      const normalized = Array.isArray(json) ? json.map((item: any) => ({
        id:         item.id,
        playerName: item.playerName || item.player || 'Unknown',
        pfrId:      item.pfrId || item.pfrid || 'N/A',
      })) : [];
      setData(normalized);
    } catch (e: any) {
      toast.error('Failed to load PFR registry', { description: e.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newPfr.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/static-data/pfr-ids', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newName, pfrId: newPfr }),
      });
      setNewName(''); setNewPfr(''); setShowAdd(false);
      fetchData();
      toast.success('Player mapped');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/static-data/pfr-ids', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteId(null);
    fetchData();
    toast.success('Entry removed');
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const text   = await file.text();
    const rows   = text.split('\n').filter(Boolean).slice(1);
    const chunks = [];
    for (let i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10));
    for (const chunk of chunks) {
      await Promise.all(chunk.map(line => {
        const [playerName, pfrId] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (playerName && pfrId) return fetch('/api/static-data/pfr-ids', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, pfrId }),
        });
      }));
    }
    toast.success(`Imported ${rows.length} entries`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchData();
  };

  const filtered = data.filter(item =>
    item.playerName.toLowerCase().includes(search.toLowerCase()) ||
    item.pfrId.toLowerCase().includes(search.toLowerCase())
  );

  const INPUT = 'w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30';

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">PFR Registry</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Static Data · {data.length} players
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search registry…"
              className="bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30 w-44 placeholder:text-muted-foreground/60" />
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-secondary border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            CSV
          </button>
          <input type="file" ref={fileRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-lg text-xs font-medium text-primary transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-primary/15 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Full Player Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Lamar Jackson" className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">PFR ID</label>
              <input value={newPfr} onChange={e => setNewPfr(e.target.value)}
                placeholder="e.g. JackLa00" className={INPUT} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving || !newName.trim() || !newPfr.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 rounded-lg text-xs font-semibold text-primary-foreground transition-colors">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Player</th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">PFR ID</th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-16 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="py-16 text-center text-muted-foreground text-sm">
                {search ? 'No results.' : 'No entries yet.'}
              </td></tr>
            ) : filtered.map((item, idx) => (
              <tr key={item.id} className={`border-b border-border hover:bg-secondary/40 transition-colors group ${idx % 2 === 0 ? 'bg-card' : 'bg-secondary/20'}`}>
                <td className="px-6 py-3 text-sm font-medium text-foreground">{item.playerName}</td>
                <td className="px-6 py-3">
                  <code className="text-[11px] font-mono text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/15">
                    {item.pfrId}
                  </code>
                </td>
                <td className="px-6 py-3 text-right">
                  {deleteId === item.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleDelete(item.id)}
                        className="text-[10px] font-semibold text-loss bg-loss/10 border border-loss/20 px-2 py-1 rounded hover:bg-loss/15 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-loss transition-all">
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