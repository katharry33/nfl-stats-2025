"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar, Search, Plus, Database, X, 
  Loader2, Trash2, Edit3, ChevronRight 
} from 'lucide-react';
import { HubTab } from "@/components/admin/HubTab";
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

const ADMIN_UID = "6Ms2U7QcMaVqyClMhNLo7uqHljk1";

interface Game {
  id: string;
  date: string;
  homeTeam: string;
  visitorTeam: string;
  season: number;
  status: string;
  week?: number | null;
}

export default function AdminDataHub() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [view, setView] = useState<'players' | 'schedules' | 'sync'>('players');
  const [activeSport, setActiveSport] = useState<'NFL' | 'NBA'>('NFL');
  const [selectedSeason, setSelectedSeason] = useState(2025);
  
  // Schedules State
  const [schedules, setSchedules] = useState<Game[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);

  // Registry State
  const { players, loading, searchTerm, setSearchTerm } = usePlayerRegistry(activeSport);

  useEffect(() => {
    if (view === 'schedules') fetchSchedules();
  }, [view, activeSport, selectedSeason]);

  const fetchSchedules = async () => {
    setSchedLoading(true);
    try {
      const colName = activeSport === 'NFL' ? 'static_nfl_schedule' : 'static_nba_schedule';
      const q = query(
        collection(db, colName),
        where('season', '==', selectedSeason),
        orderBy('date', 'desc'),
        limit(50)
      );
  
      const snapshot = await getDocs(q);
      const data: Game[] = snapshot.docs.map(doc => {
        const g = doc.data();
        return {
          id: doc.id,
          date: g.date || "",
          season: g.season || selectedSeason, // FIX: Added season
          homeTeam: g.homeTeam || g.home_team?.abbreviation || g.home_team || "TBD",
          visitorTeam: g.visitorTeam || g.visitor_team?.abbreviation || g.visitor_team || "TBD",
          status: g.status || "Scheduled",
          week: g.week || null
        };
      });
      
      setSchedules(data);
    } catch (err) {
      console.error("Schedule Fetch Error:", err);
      toast.error(`Failed to load ${activeSport} schedules`);
    } finally {
      setSchedLoading(false);
    }
  };
  
  const handleDelete = async (playerId: string, name: string) => {
    const collectionName = activeSport === 'NFL' ? 'static_pfrIdMap' : 'static_nbaIdMap';
  
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
  
    try {
      await deleteDoc(doc(db, collectionName, playerId));
      toast.success(`${name} removed.`);
    } catch (err: any) {
      toast.error("Deletion failed.");
    }
  };

  const isAuthorized = user?.uid === ADMIN_UID || true; 

  if (!authLoading && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Database className="h-12 w-12 opacity-10 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tighter italic text-white">Access Denied</h1>
        <button onClick={() => router.push('/')} className="mt-8 text-[10px] font-black border border-white/10 px-6 py-2 rounded-xl">Return Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">
            Data <span className="text-primary">Hub</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">System Mappings & Engine Room</p>
        </div>
        
        <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          {['NFL', 'NBA'].map(s => (
            <button 
              key={s}
              onClick={() => setActiveSport(s as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                activeSport === s ? 'bg-primary text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="space-y-2">
          <HubTab active={view === 'players'} onClick={() => setView('players')} icon={Users} label="Player Registry" />
          <HubTab active={view === 'schedules'} onClick={() => setView('schedules')} icon={Calendar} label="Schedules" />
          <HubTab active={view === 'sync'} onClick={() => setView('sync')} icon={Database} label="System Sync" />
        </aside>

        <div className="lg:col-span-3 bg-card/30 border border-white/5 rounded-4xl p-8 min-h-[600px] backdrop-blur-xl">
          {view === 'players' ? (
             <div className="space-y-6">
              <input 
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full mb-4 p-3 bg-black/20 border border-white/10 rounded-2xl text-sm outline-none focus:border-primary/50 transition-colors"
              />
               <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                 <table className="w-full text-left text-xs text-white">
                   <thead className="bg-white/5 text-zinc-500 font-black uppercase text-[9px] tracking-widest">
                     <tr>
                       <th className="p-5">Player</th>
                       <th className="p-5 text-center">Team</th>
                       {activeSport === 'NFL' && <th className="p-5">PFR ID</th>}
                       <th className="p-5">BDL ID</th>
                       <th className="p-5 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {loading ? (
                       <tr><td colSpan={activeSport === 'NFL' ? 5 : 4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                     ) : (
                       players.map((player) => (
                        <tr key={player.id} className="hover:bg-white/5 group transition-colors">
                          <td className="p-5 font-bold">{player.playerName}</td>
                          <td className="p-5 text-center">
                            <span className="bg-zinc-900 px-3 py-1 rounded border border-white/5 text-[10px] font-black text-zinc-400 uppercase">
                              {player.teamAbbreviation}
                            </span>
                          </td>
                          {activeSport === 'NFL' && (
                            <td className="p-5 text-zinc-500 font-mono text-[11px] italic">
                              {player.pfrid || '—'}
                            </td>
                          )}
                          <td className="p-5 text-blue-400/80 font-mono text-[11px]">
                            {player.bdlId || '—'}
                          </td>
                          <td className="p-5 text-right">
                            <button 
                              onClick={() => handleDelete(player.id, player.playerName)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          ) : view === 'schedules' ? (
            <div className="space-y-6">
              {/* ... Schedules View UI ... */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{activeSport} Schedule</h3>
                  <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black text-white outline-none"
                  >
                    <option value={2025}>2025-26</option>
                    <option value={2024}>2024-25</option>
                  </select>
                </div>
                <button onClick={fetchSchedules} className="p-2 hover:bg-white/5 rounded-lg">
                  <Loader2 className={`h-4 w-4 text-primary ${schedLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid gap-2">
                {schedules.map((game) => (
                  <div key={game.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-zinc-600 uppercase">
                          {game.date ? new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">{game.status}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-200">{game.visitorTeam}</span>
                        <span className="text-[9px] text-zinc-700 font-black tracking-tighter italic">@</span>
                        <span className="font-bold text-zinc-200">{game.homeTeam}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}