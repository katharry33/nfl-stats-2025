'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Calendar, Upload, X, Filter } from 'lucide-react';

type ScheduleEntry = {
  id: string; 
  week: number; 
  matchup: string;
  awayTeam?: string;
  homeTeam?: string;
  date: string;
};

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  
  // New Filter State
  const [season, setSeason] = useState('2024');
  const [selectedWeek, setSelectedWeek] = useState('All');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    // Passing season and week to the API
    const query = new URLSearchParams({ season });
    if (selectedWeek !== 'All') query.append('week', selectedWeek);

    fetch(`/api/static-data/schedule?${query.toString()}`)
      .then(r => r.json())
      .then(json => { 
        setData(Array.isArray(json) ? json : []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  // Re-fetch whenever season or week changes
  useEffect(() => { fetchData(); }, [season, selectedWeek]);

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
    setPendingRows(parseCsv(text));
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
          week: Number(row.Week || row.week) || 0,
          awayTeam: row.AwayTeam || row.awayTeam || row.away || '',
          homeTeam: row.HomeTeam || row.homeTeam || row.home || '',
          date: row.Date || row.date || '',
          season: season // Targeted season
        }),
      });
      count++;
    }
    setUploadMsg(`✓ Imported ${count} games to ${season}`);
    setUploading(false);
    setPendingRows([]);
    fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Upload */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">NFL Schedule</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {season} Season · {data.length} games
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Season Selector */}
          <div className="flex items-center gap-2 bg-secondary/50 border border-border px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Season</span>
            <select 
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground"
            >
              <option value="2024">2024-25</option>
              <option value="2025">2025-26</option>
            </select>
          </div>

          {/* Week Selector */}
          <div className="flex items-center gap-2 bg-secondary/50 border border-border px-3 py-1.5 rounded-lg">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select 
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground"
            >
              <option value="All">All Weeks</option>
              {Array.from({ length: 22 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-lg text-xs font-medium text-primary cursor-pointer transition-colors ml-2">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      </div>

      {/* Confirmation Modal (Unchanged logic) */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground">Confirm {season} Upload</h3>
            <p className="text-sm text-muted-foreground">
              Add <span className="text-primary font-semibold">{pendingRows.length} games</span> to the <span className="text-foreground font-bold">{season}</span> schedule.
            </p>
            <div className="flex gap-2">
              <button onClick={handleUploadConfirm} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Confirm</button>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 bg-secondary rounded-lg text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-24">Week</th>
              <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matchup</th>
              <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={3} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-muted-foreground text-sm">No games found for {season} {selectedWeek !== 'All' ? `Week ${selectedWeek}` : ''}.</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-black bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded uppercase">WK {item.week}</span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">
                    {item.matchup || `${item.awayTeam} @ ${item.homeTeam}`}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono italic">
                    {item.date}
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