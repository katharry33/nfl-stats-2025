import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { Edit3, Trash2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

const NflAdminPage = () => {
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Registry Hook integration
  const { players, loading: loadingRegistry, searchTerm, setSearchTerm } = usePlayerRegistry('NFL');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const calculateDefensiveStats = async () => {
    setLoadingStats(true);
    try {
      const scheduleSnap = await getDocs(query(collection(db, 'static_nfl_schedule'), where('season', '==', 2025), where('status', '==', 'closed')));
      const games = scheduleSnap.docs.map(doc => doc.data());
      const stats: any = {};
      games.forEach(game => {
        const home = game.homeTeam; const away = game.visitorTeam;
        if (!stats[home]) stats[home] = { ptsAllowed: 0, games: 0 };
        if (!stats[away]) stats[away] = { ptsAllowed: 0, games: 0 };
        stats[home].ptsAllowed += (game.visitorScore || 0); stats[home].games += 1;
        stats[away].ptsAllowed += (game.homeScore || 0); stats[away].games += 1;
      });
      const finalRankings = Object.keys(stats).map(t => ({
        team: t, avgPtsAllowed: (stats[t].ptsAllowed / stats[t].games).toFixed(1), sampleSize: stats[t].games
      })).sort((a, b) => parseFloat(a.avgPtsAllowed) - parseFloat(b.avgPtsAllowed));
      setTeamStats(finalRankings);
    } catch (err) { console.error(err); }
    setLoadingStats(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'static_playerTeamMapping', editingPlayer.id), editingPlayer, { merge: true });
      toast.success("NFL Mapping Updated");
      setEditingPlayer(null);
    } catch (err) { toast.error("Failed"); }
  };

  const handleDelete = async (player: any) => {
    if (!confirm(`Remove ${player.playerName} from NFL registry?`)) return;
    try {
      await deleteDoc(doc(db, 'static_playerTeamMapping', player.id));
      toast.success("Purged from NFL");
    } catch (err) { toast.error("Error"); }
  };

  useEffect(() => { calculateDefensiveStats(); }, []);

  return (
    <div className="p-8 bg-slate-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold italic tracking-tighter text-blue-500 uppercase">NFL Analytics & <span className="text-white">Registry</span></h1>
        <input 
            type="text" placeholder="Search NFL Players..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs w-64 outline-none focus:border-blue-500"
        />
      </div>

      {/* NFL REGISTRY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-12">
        <div className="p-4 bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">NFL System Mapping</div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 sticky top-0">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4 text-center">Team</th>
                <th className="p-4">PFR ID</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loadingRegistry ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse">Scanning Gridiron...</td></tr>
              ) : (
                players.map(p => (
                  <tr key={p.id} className="hover:bg-blue-500/5 group">
                    <td className="p-4 font-bold">{p.playerName}</td>
                    <td className="p-4 text-center"><span className="bg-slate-800 px-2 py-1 rounded">{p.teamAbbreviation}</span></td>
                    <td className="p-4 font-mono text-slate-500">{p.pfrid || 'MISSING'}</td>
                    <td className="p-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => setEditingPlayer(p)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-md"><Edit3 size={14}/></button>
                       <button onClick={() => handleDelete(p)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-md"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keep original Defensive Efficiency table below... */}
      {/* (Rest of your original NFL JSX here) */}

      {/* Edit Modal (NFL specific) */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
           <form onSubmit={handleUpdate} className="bg-slate-900 border border-blue-500/30 p-8 rounded-3xl w-full max-w-sm">
             <h2 className="text-xl font-bold mb-6 italic">Edit NFL Mapping</h2>
             <input value={editingPlayer.playerName} disabled className="w-full bg-black/40 p-4 rounded-xl mb-4 text-slate-500" />
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">PFR ID (Football Reference)</label>
                  <input placeholder="e.g. BradTo00" value={editingPlayer.pfrid} onChange={e => setEditingPlayer({...editingPlayer, pfrid: e.target.value})} className="w-full bg-black p-4 rounded-xl border border-slate-800 font-mono text-blue-400" />
                </div>
                <button className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase tracking-widest text-xs">Save Registry Entry</button>
                <button type="button" onClick={() => setEditingPlayer(null)} className="w-full text-slate-600 text-[10px] uppercase font-bold">Close</button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default NflAdminPage;