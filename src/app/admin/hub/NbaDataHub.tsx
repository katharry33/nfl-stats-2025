import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { Edit3, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NbaDataHub = () => {
  const [syncStats, setSyncStats] = useState<any>({});
  const [defensiveRankings, setDefensiveRankings] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Registry Hook integration
  const { players, loading: loadingPlayers, searchTerm, setSearchTerm } = usePlayerRegistry('NBA');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const fetchData = async () => {
    setLoadingStats(true);
    try {
      const scheduleRef = collection(db, 'static_nba_schedule');
      const counts: any = {};
      for (const year of [2024, 2025]) {
        const q = query(scheduleRef, where('season', '==', year));
        const snap = await getDocs(q);
        counts[year] = snap.size;
      }
      setSyncStats(counts);

      const defenseRef = collection(db, 'nba_defense_stats');
      const defQuery = query(defenseRef, where('season', '==', 2025), orderBy('avgPtsAllowed', 'asc'));
      const defSnap = await getDocs(defQuery);
      setDefensiveRankings(defSnap.docs.map(doc => doc.data()));
    } catch (err) { console.error(err); }
    setLoadingStats(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'static_nbaIdMap', editingPlayer.id), editingPlayer, { merge: true });
      toast.success("NBA Mapping Updated");
      setEditingPlayer(null);
    } catch (err) { toast.error("Save Failed"); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 italic uppercase tracking-tighter">
        🏀 NBA Admin <span className="text-blue-500">Data Hub</span>
      </h1>

      {/* Registry Section (The Missing Part) */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest">NBA Player Registry</h2>
          <input 
            type="text" placeholder="Search Roster..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-xs w-64 outline-none focus:border-blue-500"
          />
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4">Team</th>
                <th className="p-4">BDL ID</th>
                <th className="p-4">BBR ID</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loadingPlayers ? (
                <tr><td colSpan={5} className="p-10 text-center animate-pulse">Loading Roster...</td></tr>
              ) : (
                players.map(p => (
                  <tr key={p.id} className="hover:bg-slate-700/50">
                    <td className="p-4 font-bold">{p.playerName}</td>
                    <td className="p-4 text-slate-400">{p.teamAbbreviation}</td>
                    <td className="p-4 font-mono text-blue-400">{p.bdlId || '—'}</td>
                    <td className="p-4 font-mono text-purple-400">{p.bbrId || '—'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => setEditingPlayer(p)} className="p-2 hover:bg-blue-500/20 rounded-lg"><Edit3 size={14}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sync Cards & Defensive Table from your original file... */}
      {/* (Keep your original JSX for stats below here) */}

      {/* Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdate} className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit NBA Player</h2>
            <div className="space-y-4">
              <input value={editingPlayer.playerName} disabled className="w-full bg-slate-800 p-3 rounded-lg opacity-50" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="BDL ID" value={editingPlayer.bdlId} onChange={e => setEditingPlayer({...editingPlayer, bdlId: e.target.value})} className="bg-slate-800 p-3 rounded-lg border border-slate-700" />
                <input placeholder="BBR ID" value={editingPlayer.bbrId} onChange={e => setEditingPlayer({...editingPlayer, bbrId: e.target.value})} className="bg-slate-800 p-3 rounded-lg border border-slate-700" />
              </div>
              <button className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={18}/> Save Mapping
              </button>
              <button type="button" onClick={() => setEditingPlayer(null)} className="w-full text-slate-500 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default NbaDataHub;