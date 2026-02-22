'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PfrEntry { id: string; playerName: string; pfrId: string; }

export default function PfrIdsPage() {
  const [entries, setEntries]   = useState<PfrEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPfr, setEditPfr]   = useState('');
  const [saving, setSaving]     = useState(false);
  // New row state
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState('');
  const [newPfr, setNewPfr]     = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/static-data/pfr-ids');
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e =>
    !search || e.playerName.toLowerCase().includes(search.toLowerCase()) || e.pfrId.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (e: PfrEntry) => { setEditId(e.id); setEditName(e.playerName); setEditPfr(e.pfrId); };
  const cancelEdit = () => { setEditId(null); };

  const saveEdit = async () => {
    if (!editName.trim() || !editPfr.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/static-data/pfr-ids', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, playerName: editName, pfrId: editPfr }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, playerName: editName, pfrId: editPfr } : e));
      toast.success('Updated');
      setEditId(null);
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const deleteEntry = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await fetch('/api/static-data/pfr-ids', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Deleted');
  };

  const addEntry = async () => {
    if (!newName.trim() || !newPfr.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/static-data/pfr-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newName, pfrId: newPfr }),
      });
      const data = await res.json();
      setEntries(prev => [...prev, { id: data.id, playerName: newName.trim(), pfrId: newPfr.trim() }]);
      setNewName(''); setNewPfr(''); setShowAdd(false);
      toast.success('Added');
    } catch { toast.error('Failed to add'); }
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">PFR ID Map</h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">Collection: static_pfr_Id_Map · {entries.length} entries</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Player
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <Input placeholder="Search player or PFR ID..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-white text-xs" />
      </div>

      {/* Add row */}
      {showAdd && (
        <div className="flex gap-2 bg-slate-900 border border-emerald-700/40 rounded-lg p-3">
          <Input placeholder="Player Name" value={newName} onChange={e => setNewName(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white text-xs" />
          <Input placeholder="PFR ID (e.g. BarkSa00)" value={newPfr} onChange={e => setNewPfr(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white text-xs font-mono w-44" />
          <Button onClick={addEntry} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-500 shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button onClick={() => { setShowAdd(false); setNewName(''); setNewPfr(''); }} size="sm" variant="ghost" className="text-slate-400 hover:text-white shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Player Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">PFR ID</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">PFR Link</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                  {editId === entry.id ? (
                    <>
                      <td className="px-3 py-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-950 border-slate-700 text-white text-xs h-8" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={editPfr} onChange={e => setEditPfr(e.target.value)} className="bg-slate-950 border-slate-700 text-white text-xs h-8 font-mono" />
                      </td>
                      <td />
                      <td className="px-3 py-2 flex gap-1.5">
                        <Button onClick={saveEdit} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 px-2">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button onClick={cancelEdit} size="sm" variant="ghost" className="text-slate-400 h-7 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-white font-medium">{entry.playerName}</td>
                      <td className="px-4 py-3 font-mono text-blue-400 text-xs">{entry.pfrId}</td>
                      <td className="px-4 py-3">
                        {entry.pfrId && (
                          <a href={`https://www.pro-football-reference.com/players/${entry.pfrId[0]}/${entry.pfrId}.htm`}
                            target="_blank" rel="noopener" className="text-[10px] text-slate-500 hover:text-blue-400 underline-offset-2 underline">
                            pfr ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => startEdit(entry)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteEntry(entry.id, entry.playerName)} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm">
                  {search ? 'No matches found' : 'No entries yet'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}