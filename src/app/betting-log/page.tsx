'use client';
import { useState, useEffect } from 'react';
import { fetchBettingLogs } from '@/lib/firebase/queries';
import { ArrowUpDown, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'; // pnpm add lucide-react

export default function BettingLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'gameDate', direction: 'desc' });

  const loadMore = async (isInitial = false) => {
    setLoading(true);
    const { logs: newLogs, lastVisible } = await fetchBettingLogs(15, isInitial ? undefined : lastDoc);
    setLogs(prev => isInitial ? newLogs : [...prev, ...newLogs]);
    setLastDoc(lastVisible);
    setLoading(false);
  };

  useEffect(() => { loadMore(true); }, []);

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    
    setLogs([...logs].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Betting History
          </h1>
          <div className="text-sm text-slate-400">Showing {logs.length} entries</div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {[
                  { label: 'Week', key: 'week' },
                  { label: 'Game Date', key: 'gameDate' },
                  { label: 'Stake', key: 'stake' },
                  { label: 'Status', key: 'status' },
                  { label: 'Payout', key: 'payout' }
                ].map((col) => (
                  <th 
                    key={col.key}
                    onClick={() => requestSort(col.key)}
                    className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      <ArrowUpDown size={14} className={sortConfig.key === col.key ? "text-blue-400" : "text-slate-600"} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4 text-slate-400">Wk {log.week}</td>
                  <td className="p-4 font-medium">{log.gameDate}</td>
                  <td className="p-4 text-emerald-400 font-mono">${log.stake}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      log.status === 'won' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      log.status === 'lost' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-lg">
                    {log.payout > 0 ? (
                      <span className="text-emerald-400">+${log.payout}</span>
                    ) : (
                      <span className="text-slate-500">$0.00</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lastDoc && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => loadMore()} 
              disabled={loading}
              className="group flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Load More
                  <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}