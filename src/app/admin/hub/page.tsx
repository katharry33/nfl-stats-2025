"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, doc, setDoc, limit, serverTimestamp } from 'firebase/firestore';
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { Edit3, Save, X, Search, Users, Calendar, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDataHub() {
  const [activeSport, setActiveSport] = useState<'NFL' | 'NBA'>('NFL');
  const [selectedSeason, setSelectedSeason] = useState<number>(2024);
  
  // Custom hook handles the complex joining of Name + IDs
  const { players, loading: loadingRegistry, searchTerm, setSearchTerm } = usePlayerRegistry(activeSport);
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Schedules based on Sport and Season
  const fetchSchedules = async () => {
    setLoadingStats(true);
    try {
      const colName = activeSport === 'NFL' ? 'static_nfl_schedule' : 'static_nba_schedule';
      
      // Querying both Number and String to prevent "Empty Schedule" bugs
      const q = query(
        collection(db, colName), 
        where('season', 'in', [selectedSeason, selectedSeason.toString()]), 
        limit(100)
      );
      
      const snap = await getDocs(q);
      const games = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort by Date (Newest first) in JS to avoid index requirement errors
      const sorted = games.sort((a, b) => {
        const dateA = a.gameDate || "";
        const dateB = b.gameDate || "";
        return dateB.localeCompare(dateA);
      });

      setSchedules(sorted);
    } catch (err) {
      console.error("Schedule Fetch Error:", err);
      toast.error(`Could not load ${activeSport} schedules`);
    }
    setLoadingStats(false);
  };

  useEffect(() => { fetchSchedules(); }, [activeSport, selectedSeason]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (activeSport === 'NBA') {
        // NBA Path: Single save to the ID Map
        await setDoc(doc(db, 'static_nbaIdMap', editingPlayer.id), {
          ...editingPlayer,
          playerName: editingPlayer.playerName,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // NFL Path: Normalize ID and save to the PFR Map
        const idDocId = editingPlayer.playerName.replace(/\./g, '').replace(/\s+/g, '_');
        
        await setDoc(doc(db, 'static_pfrIdMap', idDocId), {
          player: editingPlayer.playerName, // Using 'player' field for DB compatibility
          pfrid: editingPlayer.pfrid || "",
          bdlId: editingPlayer.bdlId || "",
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update the main registry to keep everything in sync
        await setDoc(doc(db, 'static_playerTeamMapping', editingPlayer.id), {
          playerName: editingPlayer.playerName,
          teamAbbreviation: editingPlayer.teamAbbreviation,
          sport: 'NFL'
        }, { merge: true });
      }
      
      toast.success(`${activeSport} Registry Updated`);
      setEditingPlayer(null);
    } catch (err) {
      console.error("Save Error:", err);
      toast.error("Failed to save player data");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-slate-950 text-white min-h-screen font-sans">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            {activeSport === 'NBA' ? '🏀 NBA' : '🏈 NFL'} <span className="text-blue-500">Data Hub</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Registry & Schedule Management</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Season Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <span className="pl-3 text-[9px] font-black text-slate-600 uppercase">Season</span>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-transparent text-xs font-bold px-3 py-2 outline-none text-blue-400 cursor-pointer"
            >
              <option value={2023}>23-24</option>
              <option value={2024}>24-25</option>
              <option value={2025}>25-26</option>
            </select>
          </div>

          {/* Sport Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['NFL', 'NBA'].map((s) => (
              <button 
                key={s} onClick={() => setActiveSport(s as any)}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeSport === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        
        {/* LEFT COLUMN: REGISTRY */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Users size={16} />
              <h2 className="text-xs font-black uppercase tracking-[0.15em]">Player Registry</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              <input 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players..."
                className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 w-48 transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-800/50 sticky top-0 backdrop-blur-md border-b border-slate-800">
                  <tr>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">Player</th>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">Team</th>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">BDL ID</th>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">
                      {activeSport === 'NFL' ? 'PFR' : 'BBR'}
                    </th>
                    <th className="p-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loadingRegistry ? (
                    <tr><td colSpan={5} className="p-24 text-center text-slate-600 animate-pulse uppercase font-black text-[10px] tracking-widest">Scanning Registry...</td></tr>
                  ) : (
                    players.map(p => (
                      <tr key={p.id} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="p-5 font-bold">{p.playerName}</td>
                        <td className="p-5"><span className="bg-slate-800 px-2 py-1 rounded text-slate-400 font-medium text-[10px]">{p.teamAbbreviation}</span></td>
                        <td className="p-5 font-mono text-blue-400 font-semibold">{p.bdlId || '—'}</td>
                        <td className="p-5 font-mono text-slate-500 italic">{activeSport === 'NFL' ? p.pfrid : p.bbrId}</td>
                        <td className="p-5 text-right">
                          <button onClick={() => setEditingPlayer(p)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={14}/></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: SCHEDULES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2 text-slate-400">
            <Calendar size={16} />
            <h2 className="text-xs font-black uppercase tracking-[0.15em]">{selectedSeason} Schedule</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="max-h-[600px] overflow-y-auto font-mono">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-800/50 sticky top-0 backdrop-blur-md border-b border-slate-800">
                  <tr>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">Date/Wk</th>
                    <th className="p-5 text-slate-500 uppercase font-black text-[9px]">Matchup</th>
                    <th className="p-5 text-right text-slate-500 uppercase font-black text-[9px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loadingStats ? (
                    <tr><td colSpan={3} className="p-24 text-center text-slate-600 animate-pulse uppercase font-black text-[10px] tracking-widest">Syncing Games...</td></tr>
                  ) : schedules.length === 0 ? (
                    <tr><td colSpan={3} className="p-24 text-center text-slate-700 italic uppercase text-[10px]">No schedule found for {selectedSeason}</td></tr>
                  ) : (
                    schedules.map(game => (
                      <tr key={game.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-5 text-slate-400">{activeSport === 'NFL' ? `WK ${game.week}` : game.gameDate}</td>
                        <td className="p-5 font-medium">{game.visitorTeam} @ {game.homeTeam}</td>
                        <td className="p-5 text-right">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${game.status === 'closed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {game.status || 'Upcoming'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* EDITING MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
           <form onSubmit={handleUpdate} className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl relative border-t-blue-500/30 border-t-2">
             <button type="button" onClick={() => setEditingPlayer(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
             
             <div className="mb-8">
               <h2 className="text-xl font-black italic text-blue-400 uppercase tracking-tighter">Sync {activeSport} Identity</h2>
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Cross-Collection Mapping</p>
             </div>

             <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest text-blue-500/50">Player Identity</label>
                  <input value={editingPlayer.playerName} disabled className="w-full bg-slate-950 p-4 rounded-2xl text-slate-400 border border-slate-800 cursor-not-allowed text-xs font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">BDL ID</label>
                    <input 
                      value={editingPlayer.bdlId || ''} 
                      onChange={e => setEditingPlayer({...editingPlayer, bdlId: e.target.value})} 
                      className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-blue-400 outline-none focus:border-blue-500 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">
                      {activeSport === 'NFL' ? 'PFR ID' : 'BBR ID'}
                    </label>
                    <input 
                      value={activeSport === 'NFL' ? (editingPlayer.pfrid || '') : (editingPlayer.bbrId || '')} 
                      onChange={e => setEditingPlayer(activeSport === 'NFL' 
                        ? {...editingPlayer, pfrid: e.target.value} 
                        : {...editingPlayer, bbrId: e.target.value}
                      )} 
                      className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-white outline-none focus:border-blue-500 text-xs" 
                    />
                  </div>
                </div>

                <button 
                  disabled={isSaving}
                  className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Sync All Tables
                </button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
}