'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface EnrichModalProps {
  isOpen:            boolean;
  onClose:           () => void;
  onComplete:        () => any;
  league:            'nba' | 'nfl';
  defaultSeason:     number;
  defaultCollection?: string; 
  defaultDate?:      string;
  defaultWeek?:      number;
}

export function EnrichModal({
  isOpen,
  onClose,
  onComplete,
  league,
  defaultDate,
  defaultSeason,
  defaultCollection = 'all',
  defaultWeek,
}: EnrichModalProps) {
  const [loading, setLoading] = useState(false);
  const [force,   setForce]   = useState(false);
  
  const displayTarget = defaultDate
    ? `Date ${defaultDate}`
    : defaultWeek
    ? `Week ${defaultWeek} · ${defaultSeason}`
    : `full ${defaultSeason} season`;

  const handleEnrich = async () => {
    setLoading(true);
    const toastId = toast.loading('Connecting to NBA Stats Engine...', {
      description: `Target: ${displayTarget}`,
    });

    try {
      // Switched to POST to resolve the 405 Method Not Allowed error
      const res = await fetch('/api/nba/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: defaultSeason,
          date:   defaultDate || new Date().toISOString().split('T')[0],
          force:  force,
          league: league,
          mode:   defaultDate ? 'daily' : 'season'
        })
      });
      
      const data = await res.json();

      if (res.status === 409) {
        toast.error('Stale Data Detected', {
          id: toastId,
          description: data.message || 'Data is currently being updated by another process.',
          duration: 5000,
        });
        return;
      }

      if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);

      // Backend usually returns 'count' or 'enriched'
      const count = data.count ?? data.enriched ?? 0;

      toast.success('Enrichment Complete!', {
        id: toastId,
        description: `Successfully analyzed ${count} NBA props with updated edges.`,
        duration: 4000,
      });

      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Enrichment Error:', err);
      toast.error('Enrichment Failed', {
        id: toastId,
        description: err.message || 'Check server logs for details.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1d27] border border-[#2d313e] w-full max-w-md p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🏀</span>
          <h2 className="text-xl font-black uppercase italic text-[#f97316]">
            NBA Prop Enrichment
          </h2>
        </div>
        
        <p className="text-[#8892a4] text-sm leading-relaxed">
          Retrieves player averages, defensive rankings, and hit-rates for{' '}
          <strong className="text-[#f0f2f8]">{displayTarget}</strong>.
        </p>

        <div className="mt-8 space-y-6">
          <label className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
            <input
              type="checkbox"
              checked={force}
              onChange={e => setForce(e.target.checked)}
              className="w-5 h-5 rounded-md border-[#3a3f52] bg-transparent text-[#f97316] focus:ring-[#f97316]/20"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#f0f2f8]">Force Refresh</span>
              <span className="text-[10px] text-[#3a3f52] uppercase font-black">Overwrite existing data</span>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#2d313e] rounded-xl text-xs font-black uppercase tracking-widest text-[#8892a4] hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleEnrich}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#f97316] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
            >
              {loading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}