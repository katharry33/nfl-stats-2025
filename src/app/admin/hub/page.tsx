"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar, Search, Plus, Database, X, 
  Loader2, Trash2, GitPullRequest, GitMerge 
} from 'lucide-react';
import { HubTab } from "@/components/admin/HubTab";
import { usePlayerRegistry } from '@/hooks/use-player-registry';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, deleteDoc, doc, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';

// 🛑 REPLACE WITH YOUR ACTUAL UID
const ADMIN_UID = "YOUR_ACTUAL_FIREBASE_UID_HERE";

interface Player {
  id: string;
  player?: string;     // NFL
  playerName?: string; // NBA
  pfrid?: string;      // NFL
  bdlId?: string;      // NBA
  team: string;
}

interface Game {
  id: string;
  date: string;
  homeTeam: string;
  visitorTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  visitorScore?: number;
  season: number | string;
  status?: string;
}

export default function AdminDataHub() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [view, setView] = useState<'players' | 'schedules' | 'sync'>('players');
  const [activeSport, setActiveSport] = useState<'NFL' | 'NBA'>('NFL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<Game[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);

  const { players, loading } = usePlayerRegistry(activeSport);

  useEffect(() => {
    if (view === 'schedules') fetchSchedules();
  }, [view, activeSport]);

  const fetchSchedules = async () => {
    setSchedLoading(true);
    try {
      const colName = activeSport === 'NFL' ? 'static_schedule' : 'static_nba_schedule';
      const q = query(collection(db, colName), orderBy('date', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setSchedules(data);
    } catch (err) {
      toast.error("Failed to load schedules");
    } finally {
      setSchedLoading(false);
    }
  };

  if (!authLoading && user?.uid !== ADMIN_UID) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Database className="h-12 w-12 opacity-10 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tighter italic text-white">Access Denied</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] mt-2">Administrative Credentials Required</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-8 text-[10px] font-black border border-white/10 px-6 py-2 rounded-xl hover:bg-white/5 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const filteredPlayers = (players as Player[]).filter((p: Player) => {
    const name = activeSport === 'NFL' ? p.player : p.playerName;
    const id = activeSport === 'NFL' ? p.pfrid : p.bdlId;
    const team = p.team || '';

    return (
      name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      id?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleDelete = async (playerId: string, name: string) => {
    const collectionName = activeSport === 'NFL' ? 'static_pfrIdMap' : 'static_nbaIdMap';
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, playerId));
      toast.success("Player removed from registry");
    } catch (err) {
      toast.error("Failed to delete player");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 p-4">
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
                activeSport === s 
                ? 'bg-primary text-black shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                : 'text-zinc-500 hover:text-zinc-300'
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
          <HubTab active={view === 'sync'} onClick={() => setView('sync')} icon={Database} label="Data Sync" />
        </aside>

        <div className="lg:col-span-3 bg-card/30 border border-white/5 rounded-4xl p-8 min-h-[600px] backdrop-blur-xl">
          {view === 'players' ? (
             <div className="space-y-6">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="relative w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                   <input 
                    type="text"
                    placeholder={`Search ${activeSport}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-zinc-800 text-white"
                   />
                 </div>
                 <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full md:w-auto text-[10px] font-black bg-primary text-black px-6 py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                 >
                   <Plus className="h-4 w-4" /> Add {activeSport}
                 </button>
               </div>
               
               <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                 <table className="w-full text-left text-xs text-white">
                   <thead className="bg-white/5 text-zinc-500 font-black uppercase text-[9px] tracking-widest">
                     <tr>
                       <th className="p-5">Identity</th>
                       <th className="p-5 text-center">Team</th>
                       <th className="p-5">{activeSport === 'NFL' ? 'PFR ID' : 'BDL ID'}</th>
                       <th className="p-5 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {(loading || authLoading) ? (
                       <tr>
                         <td colSpan={4} className="p-20 text-center">
                           <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-50" />
                         </td>
                       </tr>
                     ) : filteredPlayers.length === 0 ? (
                       <tr>
                         <td className="p-20 text-center text-zinc-600 italic" colSpan={4}>
                            No records found.
                         </td>
                       </tr>
                     ) : (
                       filteredPlayers.map((player: Player) => (
                         <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                           <td className="p-5 font-bold text-zinc-200">
                             {activeSport === 'NFL' ? player.player : player.playerName}
                           </td>
                           <td className="p-5 text-center">
                             <span className="bg-zinc-900 px-3 py-1 rounded-md text-[10px] font-black border border-white/5 text-zinc-400 uppercase tracking-tighter">
                               {player.team}
                             </span>
                           </td>
                           <td className="p-5 font-mono text-primary/70 tracking-tighter">
                             {activeSport === 'NFL' ? player.pfrid : player.bdlId}
                           </td>
                           <td className="p-5 text-right">
                              <button 
                                onClick={() => handleDelete(player.id, (activeSport === 'NFL' ? player.player : player.playerName) || 'Unknown')}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Schedule Feed</h3>
                <button onClick={fetchSchedules} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <Loader2 className={`h-4 w-4 text-primary ${schedLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid gap-3">
                {schedLoading ? (
                  <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" /></div>
                ) : schedules.length === 0 ? (
                  <div className="py-20 text-center text-zinc-600 italic">No schedule records found.</div>
                ) : (
                  schedules.map((game) => (
                    <div key={game.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="text-center min-w-[60px]">
                          <p className="text-[10px] font-black text-zinc-500 uppercase">
                            {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-[8px] text-primary font-bold">{game.season}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-zinc-200">{game.visitorTeam || game.awayTeam}</span>
                          <span className="text-[10px] text-zinc-700 font-black italic">vs</span>
                          <span className="font-bold text-zinc-200">{game.homeTeam}</span>
                        </div>
                      </div>
                      <div className="text-right">
                         {game.homeScore !== undefined ? (
                           <div className="flex gap-2 items-center bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                             <span className={(game.visitorScore || 0) > (game.homeScore || 0) ? 'text-primary' : 'text-zinc-500'}>{game.visitorScore}</span>
                             <span className="text-[8px] text-zinc-800">|</span>
                             <span className={(game.homeScore || 0) > (game.visitorScore || 0) ? 'text-primary' : 'text-zinc-500'}>{game.homeScore}</span>
                           </div>
                         ) : (
                           <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Pending</span>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className='text-center py-12'>
              <h2 className='text-xl font-black uppercase tracking-tighter italic'>Data Sync Workflow</h2>
              <p className='text-zinc-500 my-4 text-[10px] uppercase tracking-widest'>Local JSON to Cloud Pipeline</p>
              
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-left my-8'>
                <div className='bg-black/40 p-6 rounded-2xl border border-white/10'>
                    <div className='flex items-center gap-4'>
                        <GitPullRequest className='text-primary h-5 w-5' />
                        <h3 className='text-sm font-black uppercase'>Pull</h3>
                    </div>
                    <p className='text-zinc-400 text-[10px] mt-3 leading-relaxed'>Update your local JSON engine from the current Firestore state.</p>
                </div>
                <div className='bg-black/40 p-6 rounded-2xl border border-white/10'>
                    <div className='flex items-center gap-4'>
                        <Users className='text-primary h-5 w-5' />
                        <h3 className='text-sm font-black uppercase'>Edit</h3>
                    </div>
                    <p className='text-zinc-400 text-[10px] mt-3 leading-relaxed'>Mass-edit mappings in VS Code with Regex or Find/Replace.</p>
                </div>
                <div className='bg-black/40 p-6 rounded-2xl border border-white/10'>
                    <div className='flex items-center gap-4'>
                        <GitMerge className='text-primary h-5 w-5' />
                        <h3 className='text-sm font-black uppercase'>Push</h3>
                    </div>
                    <p className='text-zinc-400 text-[10px] mt-3 leading-relaxed'>Deploy updated JSON mappings back to the cloud database.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddPlayerModal 
          sport={activeSport} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function AddPlayerModal({ sport, onClose }: { sport: 'NFL' | 'NBA', onClose: () => void }) {
  const [formData, setFormData] = useState({ playerName: '', team: '', idValue: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const collectionName = sport === 'NFL' ? 'static_pfrIdMap' : 'static_nbaIdMap';
      const payload = sport === 'NFL' 
        ? { player: formData.playerName, pfrid: formData.idValue, team: formData.team.toUpperCase(), lastUpdated: new Date().toISOString() }
        : { playerName: formData.playerName, bdlId: formData.idValue, team: formData.team.toUpperCase(), createdAt: new Date().toISOString() };

      await addDoc(collection(db, collectionName), payload);
      toast.success("Player registered");
      onClose();
    } catch (err) {
      toast.error("Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0c] border border-white/10 w-full max-w-md rounded-4xl p-10 shadow-2xl relative text-zinc-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black uppercase tracking-tighter italic">Add <span className="text-primary">{sport}</span></h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Full Name</label>
            <input 
              required className="w-full bg-white/3 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-primary/50 transition-colors"
              value={formData.playerName}
              onChange={(e) => setFormData({...formData, playerName: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Team</label>
              <input required className="w-full bg-white/3 border border-white/10 rounded-2xl px-5 py-4 text-sm uppercase text-white" maxLength={3} value={formData.team} onChange={(e) => setFormData({...formData, team: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{sport === 'NFL' ? 'PFR ID' : 'BDL ID'}</label>
              <input required className="w-full bg-white/3 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white" value={formData.idValue} onChange={(e) => setFormData({...formData, idValue: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-black font-black uppercase py-5 rounded-3xl mt-6 tracking-widest text-xs hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all">
            {isSubmitting ? 'Syncing...' : 'Confirm Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}