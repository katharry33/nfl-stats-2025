"use client";

import { useState } from 'react';
import { Users, Calendar, Database, Search, Edit3, Trash2, Loader2, X, Save } from 'lucide-react';
import { HubTab } from "@/components/admin/HubTab";
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminDataHub() {
  const [view, setView] = useState<'players' | 'schedules' | 'sync'>('players');
  const [activeSport, setActiveSport] = useState<'NFL' | 'NBA'>('NFL');
  
  const { players, loading, searchTerm, setSearchTerm } = usePlayerRegistry(activeSport);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const col = activeSport === 'NFL' ? 'static_playerTeamMapping' : 'static_nbaIdMap';
    try {
      await setDoc(doc(db, col, editingPlayer.id), editingPlayer, { merge: true });
      toast.success("Saved");
      setEditingPlayer(null);
    } catch (err) {
      toast.error("Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (player: any) => {
    if (!confirm(`Delete ${player.playerName}?`)) return;
    const col = activeSport === 'NFL' ? 'static_playerTeamMapping' : 'static_nbaIdMap';
    try {
      await deleteDoc(doc(db, col, player.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error("Failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header & Sport Toggle */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black italic uppercase">Data <span className="text-primary">Hub</span></h1>
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl border border-white/5">
          {['NFL', 'NBA'].map((s) => (
            <button 
              key={s} 
              onClick={() => setActiveSport(s as any)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${activeSport === s ? 'bg-primary text-black' : 'text-zinc-500'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-8">
        <aside className="space-y-2">
          <HubTab active={view === 'players'} onClick={() => setView('players')} icon={Users} label="Player Registry" />
          <HubTab active={view === 'schedules'} onClick={() => setView('schedules')} icon={Calendar} label="Schedules" />
          <HubTab active={view === 'sync'} onClick={() => setView('sync')} icon={Database} label="System Sync" />
        </aside>

        <main className="col-span-3 bg-zinc-900/50 border border-white/5 rounded-3xl p-6 min-h-[600px]">
          {view === 'players' && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input 
                  type="text" placeholder="Search registry..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-white"
                />
              </div>

              <div className="overflow-hidden border border-white/5 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-zinc-500 font-black uppercase text-[9px] tracking-widest">
                    <tr>
                      <th className="p-5">Player</th>
                      <th className="p-5">Team</th>
                      {activeSport === 'NFL' ? (
                        <th className="p-5">PFR ID</th>
                      ) : (
                        <>
                          <th className="p-5">BDL ID</th>
                          <th className="p-5">BBR ID</th>
                        </>
                      )}
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                    ) : (
                      players.map(player => (
                        <tr key={player.id} className="hover:bg-white/5 group">
                          <td className="p-5 font-bold">{player.playerName}</td>
                          <td className="p-5"><span className="bg-zinc-800 px-2 py-1 rounded text-[10px]">{player.teamAbbreviation}</span></td>
                          
                          {activeSport === 'NFL' ? (
                            <td className="p-5 font-mono text-zinc-500">{player.pfrid || '—'}</td>
                          ) : (
                            <>
                              <td className="p-5 font-mono text-blue-400">{player.bdlId || '—'}</td>
                              <td className="p-5 font-mono text-purple-400">{player.bbrId || '—'}</td>
                            </>
                          )}

                          <td className="p-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setEditingPlayer(player)} className="p-2 hover:bg-white/10 rounded-lg"><Edit3 className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(player)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-8">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-black uppercase italic">Edit <span className="text-primary">Mapping</span></h2>
              <button onClick={() => setEditingPlayer(null)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500">Player Name</label>
                <input value={editingPlayer.playerName} onChange={e => setEditingPlayer({...editingPlayer, playerName: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500">Team</label>
                  <input value={editingPlayer.teamAbbreviation} onChange={e => setEditingPlayer({...editingPlayer, teamAbbreviation: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500">Sport</label>
                  <select value={editingPlayer.sport} onChange={e => setEditingPlayer({...editingPlayer, sport: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white">
                    <option value="NFL">NFL</option>
                    <option value="NBA">NBA</option>
                  </select>
                </div>
              </div>

              {activeSport === 'NFL' ? (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500">PFR ID</label>
                  <input value={editingPlayer.pfrid} onChange={e => setEditingPlayer({...editingPlayer, pfrid: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-mono" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">BDL ID</label>
                    <input value={editingPlayer.bdlId} onChange={e => setEditingPlayer({...editingPlayer, bdlId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">BBR ID</label>
                    <input value={editingPlayer.bbrId} onChange={e => setEditingPlayer({...editingPlayer, bbrId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-mono" />
                  </div>
                </div>
              )}

              <button className="w-full bg-primary text-black font-black uppercase py-4 rounded-2xl flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                Save Player Mapping
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}