'use client';
// src/components/bets/EnrichModal.tsx
// Live-streaming enrichment progress modal
// Used on both Bet Builder and Historical Props pages

import { useState, useRef } from 'react';
import { X, Zap, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface EnrichLog {
  type: 'start' | 'progress' | 'done' | 'error';
  message: string;
  count?: number;
  enriched?: number;
  skipped?: number;
  total?: number;
}

interface EnrichModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onComplete: () => void;           // called when done — triggers data refresh
  defaultWeek?:      number;
  defaultSeason?:    number;
  defaultCollection?: 'weekly' | 'all';
}

export function EnrichModal({
  isOpen,
  onClose,
  onComplete,
  defaultWeek,
  defaultSeason    = 2025,
  defaultCollection = 'weekly',
}: EnrichModalProps) {
  const [week,       setWeek]       = useState<string>(defaultWeek ? String(defaultWeek) : '');
  const [season,     setSeason]     = useState<string>(String(defaultSeason));
  const [collection, setCollection] = useState<'weekly' | 'all'>(defaultCollection);
  const [force,      setForce]      = useState(false);

  const [logs,      setLogs]      = useState<EnrichLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone,    setIsDone]    = useState(false);
  const [isError,   setIsError]   = useState(false);
  const [showLogs,  setShowLogs]  = useState(true);

  const logRef = useRef<HTMLDivElement>(null);

  function appendLog(log: EnrichLog) {
    setLogs(prev => [...prev, log]);
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 30);
  }

  async function runEnrich() {
    setLogs([]);
    setIsRunning(true);
    setIsDone(false);
    setIsError(false);

    const weekNum = week ? parseInt(week) : undefined;

    try {
      const res = await fetch('/api/enrich', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          week:       weekNum,
          season:     parseInt(season),
          collection,
          force,
        }),
      });

      if (!res.body) throw new Error('No response stream');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const event: EnrichLog = JSON.parse(line);
            appendLog(event);
            if (event.type === 'done')  { setIsDone(true);  setIsRunning(false); onComplete(); }
            if (event.type === 'error') { setIsError(true); setIsRunning(false); }
          } catch {}
        }
      }
    } catch (err: any) {
      appendLog({ type: 'error', message: err?.message ?? 'Failed to connect' });
      setIsError(true);
      setIsRunning(false);
    }
  }

  function handleClose() {
    if (isRunning) return; // block close while running
    setLogs([]);
    setIsDone(false);
    setIsError(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isRunning ? 'text-[#FFD700] animate-pulse' : 'text-[#FFD700]'}`} />
            <span className="text-white font-black uppercase italic text-sm tracking-widest">Enrich Stats</span>
          </div>
          <button onClick={handleClose} disabled={isRunning}
            className="text-zinc-600 hover:text-white transition-colors disabled:opacity-30">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Config */}
        {!isRunning && !isDone && (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Source */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Source</label>
                <div className="flex rounded-xl overflow-hidden border border-white/5">
                  {(['weekly', 'all'] as const).map(c => (
                    <button key={c} onClick={() => setCollection(c)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${
                        collection === c ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                      }`}>
                      {c === 'weekly' ? 'Weekly' : 'Historical'}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-700">
                  {collection === 'weekly' ? 'weeklyProps_' + season : 'allProps_' + season}
                </p>
              </div>

              {/* Season */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Season</label>
                <select value={season} onChange={e => setSeason(e.target.value)}
                  className="w-full py-2 px-3 bg-black/40 border border-white/5 text-white text-xs font-mono rounded-xl outline-none focus:border-[#FFD700]/30">
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            </div>

            {/* Week */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                Week {collection === 'all' && '(optional — blank = all weeks)'}
              </label>
              <input
                type="number" min={1} max={22}
                placeholder={collection === 'all' ? 'Leave blank for all weeks' : 'Required'}
                value={week}
                onChange={e => setWeek(e.target.value)}
                className="w-full py-2 px-3 bg-black/40 border border-white/5 text-white text-xs font-mono rounded-xl outline-none focus:border-[#FFD700]/30 placeholder:text-zinc-700"
              />
            </div>

            {/* Force toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setForce(v => !v)}
                className={`w-9 h-5 rounded-full border transition-all relative ${
                  force ? 'bg-[#FFD700]/20 border-[#FFD700]/40' : 'bg-black/40 border-white/10'
                }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  force ? 'left-[18px] bg-[#FFD700]' : 'left-0.5 bg-zinc-600'
                }`} />
              </div>
              <div>
                <p className="text-xs text-zinc-300 font-bold">Force re-enrich</p>
                <p className="text-[10px] text-zinc-600">Re-run even on already-enriched props</p>
              </div>
            </label>

            {/* Run button */}
            <button
              onClick={runEnrich}
              disabled={collection === 'weekly' && !week}
              className="w-full py-3 rounded-xl bg-[#FFD700] hover:bg-[#e6c200] text-black text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-30">
              Run Enrichment
            </button>
          </div>
        )}

        {/* Progress */}
        {(isRunning || isDone || isError) && (
          <div className="px-5 py-4 space-y-3">
            {/* Status banner */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              isRunning ? 'bg-blue-500/10 border-blue-500/20' :
              isDone    ? 'bg-emerald-500/10 border-emerald-500/20' :
              'bg-red-500/10 border-red-500/20'
            }`}>
              {isRunning && <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
              {isDone    && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError   && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <div className="min-w-0">
                <p className={`text-xs font-black uppercase ${
                  isRunning ? 'text-blue-400' : isDone ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {isRunning ? 'Running...' : isDone ? 'Complete' : 'Error'}
                </p>
                {isDone && (() => {
                  const last = logs[logs.length - 1];
                  if (last?.count != null) return (
                    <p className="text-[10px] text-emerald-300 font-mono">{last.count} props enriched</p>
                  );
                })()}
              </div>
            </div>

            {/* Log output */}
            <div>
              <button onClick={() => setShowLogs(v => !v)}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 font-black uppercase mb-1.5">
                {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Log output ({logs.length})
              </button>
              {showLogs && (
                <div ref={logRef}
                  className="bg-black/60 border border-white/5 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className={
                      log.type === 'error'    ? 'text-red-400' :
                      log.type === 'done'     ? 'text-emerald-400' :
                      log.type === 'start'    ? 'text-[#FFD700]' :
                      'text-zinc-400'
                    }>
                      <span className="text-zinc-700 mr-2">{String(i + 1).padStart(2, '0')}</span>
                      {log.message}
                    </div>
                  ))}
                  {isRunning && (
                    <div className="text-zinc-700 animate-pulse">▋</div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {isDone && (
                <button onClick={runEnrich}
                  className="flex-1 py-2 rounded-xl border border-white/5 text-zinc-400 hover:text-white text-xs font-black uppercase transition-colors">
                  Run Again
                </button>
              )}
              <button onClick={handleClose} disabled={isRunning}
                className="flex-1 py-2 rounded-xl bg-[#FFD700] hover:bg-[#e6c200] text-black text-xs font-black uppercase transition-colors disabled:opacity-30">
                {isDone ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}