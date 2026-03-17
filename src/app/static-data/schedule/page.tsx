'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Calendar, Upload, X } from 'lucide-react';

type ScheduleEntry = {
  id: string; week: number; matchup: string;
  'game date': string; 'game time': string;
};

export default function SchedulePage() {
  const [data,        setData]        = useState<ScheduleEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [uploadMsg,   setUploadMsg]   = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    // No season param — GET now returns all games (see fixed API)
    fetch('/api/static-data/schedule')
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const parseCsv = (text: string) => {
    const lines  = text.split('\n').filter(Boolean);
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
    setPendingRows(parseCsv(text));
    setShowConfirm(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    setUploading(true); setShowConfirm(false); setUploadMsg('');
    let count = 0;
    for (const row of pendingRows) {
      await fetch('/api/static-data/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    const w = Number(g.week) || 0;
    if (!acc[w]) acc[w] = [];
    acc[w].push(g);
    return acc;
  }, {});
  const weeks = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">NFL Schedule</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Static Data · {data.length} games
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {uploadMsg && <span className="text-[11px] text-profit font-mono font-medium">{uploadMsg}</span>}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-lg text-xs font-medium text-primary cursor-pointer transition-colors">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload Season
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground font-mono">
        CSV format: <span className="text-foreground/70">Week,AwayTeam,HomeTeam,Date</span>
      </p>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Confirm Upload</h3>
              <button onClick={() => setShowConfirm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will add <span className="text-primary font-semibold">{pendingRows.length} games</span> to the schedule.
              Existing games are not deleted.
            </p>
            <div className="flex gap-2">
              <button onClick={handleUploadConfirm}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-colors">
                Confirm Import
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 bg-secondary border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-24">Week</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Matchup</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-16 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="py-16 text-center text-muted-foreground text-sm">
                No schedule data. Upload a CSV to get started.
              </td></tr>
            ) : weeks.map(week =>
              grouped[week].map((item, i) => (
                <tr key={item.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-3">
                    {i === 0 && (
                      <span className="text-primary font-semibold font-mono text-xs bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                        WK {week}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{item.matchup}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                    {item['game date'] ? new Date(item['game date']).toLocaleDateString() : ''}
                    {item['game time'] && <span className="ml-2 text-muted-foreground/60">{item['game time']}</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}