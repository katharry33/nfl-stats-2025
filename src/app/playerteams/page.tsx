'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const NFL_TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'];

interface Entry { id: string; playerName: string; team: string; }

export default function PlayerTeamsPage() {
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [saving, setSaving]     = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState('');
  const [newTeam, setNewTeam]   = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/static-data/player-teams');
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e =>
    !search || e.playerName.toLowerCase().includes(search.toLowerCase()) || e.team.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (e: Entry) => { setEditId(e.id); setEditName(e.playerName); setEditTeam(e.team); };
  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    if (!editName.trim() || !editTeam) return;
    setSaving(true);
    try {
      await fetch('/api/static-data/player-teams', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, playerName: editName, team: editTeam }),
      });
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, playerName: editName, team: editTeam.toUpperCase() } : e));
      toast.success('Updated'); setEditId(null);
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const deleteEntry = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await fetch('/api/static-data/player-teams', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Deleted');
  };

  const addEntry = async () => {
    if (!newName.trim() || !newTeam) return;
    setSaving(true);
    try {
      const res = await fetch('/api/static-data/player-teams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newName, team: newTeam }),
      });
      const data = await res.json();
      setEntries(prev => [...prev, { id: data.id, playerName: newName.trim(), team: newTeam.toUpperCase() }]);
      setNewName(''); setNewTeam(''); setShowAdd(false); toast.success('Added');
    } catch { toast.error('Failed to add'); }
    setSaving(false);
  };

  const TeamSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 h-8 focus:ring-1 focus:ring-emerald-500 outline-none w-24">
      <option value="">Team</option>
      {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">Player → Team</h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">Collection: static_playerTeamMapping · {entries.length} entries</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Player
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <Input placeholder="Search player or team..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-white text-xs" />
      </div>

      {showAdd && (
        <div className="flex gap-2 bg-slate-900 border border-emerald-700/40 rounded-lg p-3">
          <Input placeholder="Player Name" value={newName} onChange={e => setNewName(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white text-xs flex-1" />
          <TeamSelect value={newTeam} onChange={setNewTeam} />
          <Button onClick={addEntry} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-8 px-2 shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button onClick={() => { setShowAdd(false); setNewName(''); setNewTeam(''); }} size="sm" variant="ghost" className="text-slate-400 h-8 px-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Player Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team</th>
                <th className="px-4 py-3 w-20" />
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
                      <td className="px-3 py-2"><TeamSelect value={editTeam} onChange={setEditTeam} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <Button onClick={saveEdit} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 px-2">
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button onClick={cancelEdit} size="sm" variant="ghost" className="text-slate-400 h-7 px-2"><X className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-white font-medium">{entry.playerName}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-800 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded">{entry.team}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => startEdit(entry)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteEntry(entry.id, entry.playerName)} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500 text-sm">
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