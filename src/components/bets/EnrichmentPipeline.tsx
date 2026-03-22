'use client';

import React, { useState } from 'react';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function EnrichmentPipeline() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [step, setStep] = useState(0);

  const steps = [
    { label: 'Fetching Odds', route: '/api/nba/ingest' },
    { label: 'Analyzing Stats', route: '/api/nba/enrich' },
    { label: 'Calculating Confidence', route: '/api/nba/recalculate' } // Optional 3rd step
  ];

  const runFullPipeline = async () => {
    setStatus('loading');
    setStep(0);
    try {
      // 1. Ingest (Odds API)
      setStep(1);
      await fetch('/api/nba/ingest?season=2025');
      
      // 2. Enrich (BBRef/Stats)
      setStep(2);
      const today = new Date().toISOString().split('T')[0];
      const enrichRes = await fetch(`/api/nba/enrich?date=${today}&season=2025`);

      if (enrichRes.status === 409) {
        toast.error("Grade yesterday's games first!");
        setStatus('error');
        return;
      }
      
      setStatus('success');
      toast.success("Sync and Analysis Complete!");
    } catch (err: any) {
      console.error("Pipeline failed:", err);
      setStatus('error');
      toast.error("Pipeline failed at " + steps[step - 1]?.label);
    }
  }

  return (
    <div className="p-6 bg-[#0d0d0d] border border-white/10 rounded-[32px] w-full max-w-sm shadow-2xl">
      <div className="flex flex-col items-center text-center space-y-4">
        
        {/* Icon Header */}
        <div className={cn(
          "h-16 w-16 rounded-3xl flex items-center justify-center transition-all duration-500",
          status === 'loading' ? "bg-[#FFD700] animate-pulse" : "bg-white/5"
        )}>
          {status === 'loading' ? (
            <Loader2 className="text-black animate-spin" size={32} />
          ) : (
            <Zap className={cn(status === 'success' ? "text-[#FFD700]" : "text-slate-500")} size={32} />
          )}
        </div>

        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
            {status === 'loading' ? 'Syncing Data...' : "Get Today's Props"}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Odds API • BBRef • TeamRankings
          </p>
        </div>

        {/* Progress Logic */}
        {status === 'loading' && (
          <div className="w-full space-y-2 mt-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-400 px-1">
              <span>{steps[step - 1]?.label}</span>
              <span>{Math.round((step / steps.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FFD700] transition-all duration-500 shadow-[0_0_10px_rgba(255,215,0,0.5)]" 
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={runFullPipeline}
          disabled={status === 'loading'}
          className={cn(
            "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2",
            status === 'loading' 
              ? "bg-white/5 text-slate-500 cursor-not-allowed" 
              : "bg-[#FFD700] hover:bg-[#FFE44D] text-black shadow-[0_8px_30px_rgba(255,215,0,0.15)]"
          )}
        >
          {status === 'loading' ? 'Processing...' : 'Sync & Enrich Props'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-emerald-400 animate-in fade-in zoom-in">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Database Updated</span>
          </div>
        )}
         {status === 'error' && (
          <div className="flex items-center gap-2 text-red-400 animate-in fade-in zoom-in">
            <AlertCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Pipeline Failed</span>
          </div>
        )}
      </div>
    </div>
  );
}
