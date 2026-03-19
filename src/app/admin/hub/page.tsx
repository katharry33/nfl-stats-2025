'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Calendar, 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "@/lib/firebase/provider";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export default function AdminHub() {
  // 1. Auth & Admin Gate
  const auth = useAuth();
  
  const [sport, setSport] = useState<'nfl' | 'nba'>('nfl');
  const [view, setView] = useState<'registry' | 'schedule'>('registry');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Schedule Specific Filters
  const [season, setSeason] = useState('2025');
  const [week, setWeek] = useState('All');

  const fetchData = async () => {
    // Prevent fetching if not authenticated or not admin
    if (!auth?.user) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ season, week });
      const res = await fetch(`/api/admin/static/${sport}/${view}?${params}`);
      
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (error: any) {
      toast.error("Fetch Error", { description: error.message });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sport, view, season, week, auth?.user]);

  // Handle loading and auth states
  if (!auth || auth.loading) return <PageLoader />;

  // 2. Security Check (Optional: Redirect if not admin)
  if (!auth.isAdmin) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-loss" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This area is restricted to operators.</p>
      </div>
    );
  }

  const filteredData = data.filter(item => 
    (item.player || item.matchup || item.playerName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the static mapping.")) return;
    
    try {
      const res = await fetch(`/api/admin/static/${sport}/${view}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        toast.success("Entry deleted");
        fetchData();
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ── Top Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            Data <span className="text-primary">Command Center</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            <span>Admin</span> <ChevronRight className="h-3 w-3" /> 
            <span className={sport === 'nba' ? 'text-orange-500' : 'text-primary'}>{sport}</span> 
            <ChevronRight className="h-3 w-3" />
            <span>{view}</span>
          </div>
        </div>

        <div className="flex bg-secondary/50 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setSport('nfl')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${sport === 'nfl' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            🏈 NFL
          </button>
          <button 
            onClick={() => setSport('nba')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${sport === 'nba' ? 'bg-background shadow text-orange-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            🏀 NBA
          </button>
        </div>
      </div>

      {/* ── View Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-2">
          <button 
            onClick={() => setView('registry')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-bold ${view === 'registry' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-card border-border text-muted-foreground hover:border-white/10 hover:bg-white/5'}`}
          >
            <Users className="h-4 w-4" /> Player Registry
          </button>
          <button 
            onClick={() => setView('schedule')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-bold ${view === 'schedule' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-card border-border text-muted-foreground hover:border-white/10 hover:bg-white/5'}`}
          >
            <Calendar className="h-4 w-4" /> Game Schedule
          </button>
        </div>

        <div className="lg:col-span-3 bg-[#0f1115] border border-white/5 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder={`Filter ${view}...`} 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" 
              />
            </div>

            <div className="flex items-center gap-2">
              {view === 'schedule' && (
                <>
                  <select 
                    value={season} 
                    onChange={e => setSeason(e.target.value)} 
                    className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-black uppercase outline-none"
                  >
                    <option value="2024">2024-25</option>
                    <option value="2025">2025-26</option>
                  </select>
                  {/* Week filter usually only makes sense for NFL */}
                  {sport === 'nfl' && (
                    <select 
                      value={week} 
                      onChange={e => setWeek(e.target.value)} 
                      className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-black uppercase outline-none"
                    >
                      <option value="All">All Weeks</option>
                      {Array.from({ length: 22 }, (_, i) => <option key={i+1} value={i+1}>Week {i+1}</option>)}
                    </select>
                  )}
                </>
              )}
              
              <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Manual
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden bg-zinc-900/20">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
                <tr>
                  {view === 'registry' ? (
                    <>
                      <th className="px-6 py-4">Player</th>
                      <th className="px-6 py-4">Team</th>
                      <th className="px-6 py-4">{sport === 'nba' ? 'BDL ID' : 'PFR ID'}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 w-20">Week</th>
                      <th className="px-6 py-4">Matchup</th>
                      <th className="px-6 py-4">Date</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-zinc-500 text-sm italic">No entries found matching your criteria.</td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {view === 'registry' ? (
                        <>
                          <td className="px-6 py-4 font-bold text-zinc-200">{item.player || item.playerName}</td>
                          <td className="px-6 py-4">
                            <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter">
                              {item.team || 'FA'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-primary">
                            {sport === 'nba' ? item.bdlId : item.pfrid || item.pfrId}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-black text-[10px] text-zinc-500 italic">
                            {sport === 'nfl' ? `WK ${item.week}` : 'NBA'}
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-200 uppercase tracking-tight">
                            {item.matchup || `${item.awayTeam} @ ${item.homeTeam}`}
                          </td>
                          <td className="px-6 py-4 text-[11px] text-zinc-500 font-mono">
                            {item['game date'] || item.date}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-loss transition-all"
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
      </div>
    </div>
  );
}