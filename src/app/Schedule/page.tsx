'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Search, Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Game { id: string; week: number; gameDate: string; gameTime: string; homeTeam: string; awayTeam: string; matchup: string; }

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

export default function SchedulePage() {
  const [games, setGames]       = useState<Game[]>([]);
  const [loading, setLoading]   = useState(true);
  const [season, setSeason]     = useState('2025');
  const [search, setSearch]     = useState('');
  const [weekFilter, setWeek]   = useState('all');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState<Record<string, string>[] | null>(null);
  const [csvFile, setCsvFile]   = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/static-data/schedule?season=${season}`);
    setGames(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [season]);

  const weeks = [...new Set(games.map(g => g.week))].sort((a, b) => a - b);

  const filtered = games.filter(g => {
    if (weekFilter !== 'all' && g.week !== parseInt(weekFilter)) return false;
    if (search && !g.matchup?.toLowerCase().includes(search.toLowerCase()) &&
        !g.homeTeam?.toLowerCase().includes(search.toLowerCase()) &&
        !g.awayTeam?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string);
      setPreview(parsed.slice(0, 5)); // show first 5 rows as preview
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      const text = await csvFile.text();
      const parsed = parseCSV(text);
      if (!parsed.length) throw new Error('No rows found in CSV');

      const res = await fetch('/api/static-data/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: parsed, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`✅ Imported ${data.written} games`);
      setCsvFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const deleteGame = async (id: string) => {
    await fetch('/api/static-data/schedule', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setGames(prev => prev.filter(g => g.id !== id));
    toast.success('Removed');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">Schedule</h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">Collection: schedule · {games.length} games</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Season toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-800">
            {['2025', '2024'].map(s => (
              <button key={s} onClick={() => setSeason(s)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${season === s ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => fileRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {/* CSV Preview + confirm */}
      {preview && csvFile && (
        <div className="bg-slate-900 border border-emerald-700/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <FileText className="h-4 w-4" />
            {csvFile.name} — preview (first 5 rows)
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs text-slate-300 w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {Object.keys(preview[0] || {}).map(h => (
                    <th key={h} className="px-2 py-1 text-left text-slate-500 uppercase font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Object.values(row).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold gap-1.5">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Import to {season}
            </Button>
            <Button onClick={() => { setCsvFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
              variant="ghost" className="text-slate-400 hover:text-white text-xs">
              Cancel
            </Button>
          </div>
          <p className="text-[10px] text-slate-500">
            Expected columns: <span className="font-mono text-slate-400">week, gameDate, gameTime, homeTeam, awayTeam, matchup</span>
            <br />Any casing works (Week, GameDate, etc.). matchup auto-generates from homeTeam/awayTeam if absent.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input placeholder="Search matchup or team..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white text-xs" />
        </div>
        <select value={weekFilter} onChange={e => setWeek(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500">
          <option value="all">All Weeks</option>
          {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-slate-500">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{games.length === 0 ? 'No schedule loaded — upload a CSV to get started' : 'No games match your filters'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wk</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matchup</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-bold">{g.week}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono">{g.gameDate}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{g.gameTime || '—'}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    {g.matchup || `${g.awayTeam} @ ${g.homeTeam}`}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteGame(g.id)} className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}