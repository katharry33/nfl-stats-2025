import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, doc, setDoc, limit } from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { Edit3, Save, X, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const NbaDataHub = () => {
  const [syncStats, setSyncStats] = useState<any>({});
  const [schedules, setSchedules] = useState<any[]>([]);
  const [defensiveRankings, setDefensiveRankings] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const { players, loading: loadingPlayers, searchTerm, setSearchTerm } = usePlayerRegistry('NBA');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const fetchData = async () => {
    setLoadingStats(true);
    try {
      // 1. Fetch Schedule Summary & List
      const scheduleRef = collection(db, 'static_nba_schedule');
      const counts: any = {};
      for (const year of [2024, 2025]) {
        const q = query(scheduleRef, where('season', '==', year));
        const snap = await getDocs(q);
        counts[year] = snap.size;
      }
      setSyncStats(counts);

      // Get latest 20 games
      const listQuery = query(scheduleRef, orderBy('gameDate', 'desc'), limit(20));
      const listSnap = await getDocs(listQuery);
      setSchedules(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Defensive Stats
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
    <div className="p-6 bg-slate-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold italic uppercase tracking-tighter">
          🏀 NBA Admin <span className="text-blue-500">Data Hub</span>
        </h1>
        <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
           <span>2024: {syncStats[2024] || 0} Games</span>
           <span>2025: {syncStats[2025] || 0} Games</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registry Section */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest">Player Registry</h2>
            <input 
              type="text" placeholder="Search Roster..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs w-48 outline-none focus:border-blue-500"
            />
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="p-4">Player</th>
                  <th className="p-4">BDL ID</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingPlayers ? (
                  <tr><td colSpan={3} className="p-10 text-center animate-pulse">Loading...</td></tr>
                ) : (
                  players.map(p => (
                    <tr key={p.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="p-4 font-bold">{p.playerName} <span className="text-[9px] text-slate-500 ml-1">{p.teamAbbreviation}</span></td>
                      <td className="p-4 font-mono text-blue-400">{p.bdlId || '—'}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => setEditingPlayer(p)} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400"><Edit3 size={14}/></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Schedule Section */}
        <section>
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-4">NBA Schedule Feed</h2>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Matchup</th>
                  <th className="p-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingStats ? (
                  <tr><td colSpan={3} className="p-10 text-center">Loading Schedule...</td></tr>
                ) : (
                  schedules.map(game => (
                    <tr key={game.id} className="hover:bg-slate-800/50">
                      <td className="p-4 text-slate-500 font-mono">{game.gameDate}</td>
                      <td className="p-4 font-bold">{game.visitorTeam} @ {game.homeTeam}</td>
                      <td className="p-4 text-right font-mono text-blue-400">
                        {game.visitorScore ?? '—'} - {game.homeScore ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdate} className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold italic uppercase tracking-tighter">Edit Mapping</h2>
              <button type="button" onClick={() => setEditingPlayer(null)}><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Player Name</label>
                <input value={editingPlayer.playerName} disabled className="w-full bg-slate-800 p-3 rounded-xl opacity-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-1">BDL ID</label>
                  <input value={editingPlayer.bdlId} onChange={e => setEditingPlayer({...editingPlayer, bdlId: e.target.value})} className="bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-1">BBR ID</label>
                  <input value={editingPlayer.bbrId} onChange={e => setEditingPlayer({...editingPlayer, bbrId: e.target.value})} className="bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500" />
                </div>
              </div>
              <button className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors">
                <Save size={18}/> Save Mapping
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default NbaDataHub;