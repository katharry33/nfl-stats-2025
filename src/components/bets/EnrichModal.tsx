'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface EnrichModalProps {
  isOpen:             boolean;
  onClose:            () => void;
  onComplete:         () => void;
  league:             'nba' | 'nfl';
  defaultSeason:      number;
  defaultCollection?: string; 
  defaultDate?:       string;
  defaultWeek?:       number;
}

export function EnrichModal({
  isOpen, onClose, onComplete, league, defaultDate, defaultSeason, defaultWeek,
}: EnrichModalProps) {
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  
  const displayTarget = defaultDate
    ? `Date ${defaultDate}`
    : defaultWeek
    ? `Week ${defaultWeek} · ${defaultSeason}`
    : `full ${defaultSeason} season`;

  const handleEnrich = async () => {
    setLoading(true);
    const toastId = toast.loading(`Connecting to ${league.toUpperCase()} Stats Engine...`, {
      description: `Target: ${displayTarget}`,
    });

    try {
      const res = await fetch(`/api/${league}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: defaultSeason,
          date: defaultDate || new Date().toISOString().split('T')[0],
          force: force,
          league: league,
          mode: defaultDate ? 'daily' : 'season'
        })
      });
      
      const data = await res.json();

      if (res.status === 409) {
        toast.error('Stale Data Detected', {
          id: toastId,
          description: data.message || 'Data is currently being updated.',
          duration: 5000,
        });
        return;
      }

      if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);

      const count = data.count ?? data.enriched ?? 0;

      toast.success('Enrichment Complete!', {
        id: toastId,
        description: `Successfully analyzed ${count} ${league.toUpperCase()} props with updated edges.`,
        duration: 4000,
      });

      onComplete();
      onClose();
    } catch (err: any) {
      toast.error('Enrichment Failed', {
        id: toastId,
        description: err.message || 'Check server logs.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1d27] border border-[#2d313e] w-full max-w-md p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{league === 'nba' ? '🏀' : '🏈'}</span>
          <h2 className="text-xl font-black uppercase italic text-orange-500">
            {league.toUpperCase()} Prop Enrichment
          </h2>
        </div>
        
        <p className="text-slate-400 text-sm leading-relaxed">
          Retrieves player averages, defensive rankings, and hit-rates for{' '}
          <strong className="text-white">{displayTarget}</strong>.
        </p>

        <div className="mt-8 space-y-6">
          <label className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
            <input
              type="checkbox"
              checked={force}
              onChange={e => setForce(e.target.checked)}
              className="w-5 h-5 rounded-md border-slate-700 bg-transparent text-orange-500 focus:ring-orange-500/20"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">Force Refresh</span>
              <span className="text-[10px] text-slate-500 uppercase font-black">Overwrite existing data</span>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#2d313e] rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleEnrich}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
            >
              {loading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}