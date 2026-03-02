'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Calendar, Upload, X } from 'lucide-react';

type ScheduleEntry = { id: string; week: number; matchup: string; 'game date': string; 'game time': string };

export default function SchedulePage() {
  const [data, setData]           = useState<ScheduleEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/static-data/schedule')
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const parseCsv = (text: string) => {
    const lines = text.split('\n').filter(Boolean);
    const header = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']));
    }).filter(r => r.Week || r.week);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    setPendingRows(rows);
    setShowConfirm(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    setUploading(true); setShowConfirm(false); setUploadMsg('');
    let count = 0;
    for (const row of pendingRows) {
      await fetch('/api/static-data/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Week:     Number(row.Week || row.week) || 0,
          AwayTeam: row.AwayTeam || row.awayTeam || row.away || '',
          HomeTeam: row.HomeTeam || row.homeTeam || row.home || '',
          Date:     row.Date || row.date || '',
        }),
      });
      count++;
    }
    setUploadMsg(`✓ Imported ${count} games`);
    setUploading(false);
    setPendingRows([]);
    fetchData();
  };

  const grouped = data.reduce<Record<number, ScheduleEntry[]>>((acc, g) => {
    const w = g.week;
    if (!acc[w]) acc[w] = [];
    acc[w].push(g);
    return acc;
  }, {});
  const weeks = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[#060606] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl flex items-center justify-center">
            <Calendar className="h-4 w-4 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">2025 NFL Schedule</h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
              Static Data · {data.length} games
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadMsg && <span className="text-[10px] text-emerald-400 font-mono font-bold">{uploadMsg}</span>}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 rounded-xl text-xs font-black text-[#FFD700] uppercase tracking-widest cursor-pointer transition-colors">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload New Season
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      </div>

      <p className="text-[10px] text-zinc-700 font-mono">
        CSV format: <span className="text-zinc-500">Week,AwayTeam,HomeTeam,Date</span>
      </p>

      {/* Upload Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0f1115] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Confirm Upload</h3>
              <button onClick={() => setShowConfirm(false)} className="text-zinc-600 hover:text-zinc-400"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-zinc-400">
              This will add <span className="text-[#FFD700] font-black">{pendingRows.length} games</span> to the schedule.
              Existing games are not deleted — upload a fresh season by clearing old data first.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleUploadConfirm}
                className="flex-1 py-2.5 bg-[#FFD700] hover:bg-[#FFD700]/90 rounded-xl text-xs font-black text-black uppercase tracking-widest transition-colors"
              >
                Confirm Import
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl text-xs font-black text-zinc-500 uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full">
          <thead className="border-b border-white/[0.06]">
            <tr>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] w-24">Week</th>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Matchup</th>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-[#FFD700] mx-auto" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="py-16 text-center text-zinc-600 text-sm">No schedule data. Upload a CSV to get started.</td></tr>
            ) : (
              weeks.map(week => (
                <React.Fragment key={week}>
                  {grouped[week].map((item, i) => (
                    <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        {i === 0 && (
                          <span className="text-[#FFD700] font-black font-mono text-xs bg-[#FFD700]/10 border border-[#FFD700]/20 px-2.5 py-1 rounded-lg">
                            WK {week}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-white">{item.matchup}</td>
                      <td className="px-5 py-3 text-xs text-zinc-500 font-mono">
                        {item['game date'] ? new Date(item['game date']).toLocaleDateString() : ''}
                        {item['game time'] && <span className="ml-2 text-zinc-700">{item['game time']}</span>}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
