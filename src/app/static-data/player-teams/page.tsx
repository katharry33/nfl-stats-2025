'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Users, Plus, Upload, Trash2, X, Check, Pencil } from 'lucide-react';

type PlayerTeam = { id: string; player: string; team: string };

export default function PlayerTeamsPage() {
  const [data,       setData]       = useState<PlayerTeam[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newTeam,    setNewTeam]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState('');
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [editRow,    setEditRow]    = useState<PlayerTeam | null>(null);
  const [editTeam,   setEditTeam]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/static-data/player-teams')
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newTeam.trim()) return;
    setSaving(true);
    await fetch('/api/static-data/player-teams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: newName, team: newTeam }),
    });
    setNewName(''); setNewTeam(''); setShowAdd(false); setSaving(false);
    fetchData();
  };

  const handleEdit = async () => {
    if (!editRow || !editTeam.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/static-data/player-teams', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editRow.id, player: editRow.player, team: editTeam }),
      });
      if (res.ok) { setEditRow(null); setEditTeam(''); fetchData(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/static-data/player-teams', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteId(null);
    fetchData();
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg('');
    const text = await file.text();
    const rows = text.split('\n').filter(Boolean).slice(1);
    let count  = 0;
    for (const line of rows) {
      const [playerName, team] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (playerName && team) {
        await fetch('/api/static-data/player-teams', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, team }),
        });
        count++;
      }
    }
    setUploadMsg(`✓ Imported ${count} players`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchData();
  };

  const INPUT = 'w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30';

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Player → Team</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Static Data · {data.length} players
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {uploadMsg && <span className="text-[11px] text-profit font-mono font-medium">{uploadMsg}</span>}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-secondary border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-lg text-xs font-medium text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Manual
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground font-mono">
        CSV format: <span className="text-foreground/70">playerName,team</span> — first row treated as header and skipped
      </p>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-primary/15 rounded-xl p-5 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Player Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Tyreek Hill" className={INPUT} />
          </div>
          <div className="w-32">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Team</label>
            <input value={newTeam} onChange={e => setNewTeam(e.target.value)}
              placeholder="MIA" className={`${INPUT} uppercase`} />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleAdd} disabled={saving || !newName.trim() || !newTeam.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 rounded-lg text-xs font-semibold text-primary-foreground transition-colors">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            <button onClick={() => { setShowAdd(false); setNewName(''); setNewTeam(''); }}
              className="p-2.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Player Name</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
              <th className="px-5 py-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-16 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="py-16 text-center text-muted-foreground text-sm">No players yet.</td></tr>
            ) : data.map((item, idx) => (
              <tr key={item.id} className={`border-b border-border hover:bg-secondary/40 transition-colors group ${idx % 2 === 0 ? 'bg-card' : 'bg-secondary/20'}`}>
                <td className="px-5 py-3 text-sm font-medium text-foreground">{item.player}</td>
                <td className="px-5 py-3">
                  {editRow?.id === item.id ? (
                    <input value={editTeam} autoFocus
                      onChange={e => setEditTeam(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditRow(null); }}
                      className="w-20 bg-background border border-primary/30 rounded-lg px-2 py-1 text-xs text-primary font-mono focus:outline-none focus:ring-1 focus:ring-primary/40 uppercase" />
                  ) : (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.team}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {editRow?.id === item.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={handleEdit} disabled={saving}
                        className="text-[10px] font-semibold text-profit bg-profit/10 border border-profit/20 px-2 py-1 rounded-lg hover:bg-profit/15 transition-colors">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </button>
                      <button onClick={() => setEditRow(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : deleteId === item.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleDelete(item.id)}
                        className="text-[10px] font-semibold text-loss bg-loss/10 border border-loss/20 px-2 py-1 rounded-lg hover:bg-loss/15 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditRow(item); setEditTeam(item.team); }}
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)}
                        className="text-muted-foreground hover:text-loss transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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