'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Hash, Plus, Upload, Trash2, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

// Unified type to match the API
type PfrEntry = { 
  id: string; 
  playerName: string; // Changed from 'player'
  pfrId: string;      // Changed from 'pfrid'
};

export default function PfrIdsPage() {
  const [data, setData] = useState<PfrEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPfr, setNewPfr] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/static-data/pfr-ids');
      const json = await r.json();
      // Ensure we map the fields correctly if they come from Firebase differently
      const normalized = Array.isArray(json) ? json.map((item: any) => ({
        id: item.id,
        playerName: item.playerName || item.player || 'Unknown',
        pfrId: item.pfrId || item.pfrid || 'N/A'
      })) : [];
      setData(normalized);
    } catch (e) {
      toast.error("Failed to sync PFR database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newPfr.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/static-data/pfr-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newName, pfrId: newPfr }),
      });
      setNewName(''); setNewPfr(''); setShowAdd(false);
      fetchData();
      toast.success("Player mapped successfully");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const text = await file.text();
    const rows = text.split('\n').filter(Boolean).slice(1);
    
    // Logic to process in chunks of 10 to prevent overloading the API
    const chunkSize = 10;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await Promise.all(chunk.map(line => {
        const [playerName, pfrId] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (playerName && pfrId) {
          return fetch('/api/static-data/pfr-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, pfrId }),
          });
        }
      }));
    }
    
    toast.success(`Imported ${rows.length} entries`);
    setUploading(false);
    fetchData();
  };

  const filteredData = data.filter(item => 
    item.playerName.toLowerCase().includes(search.toLowerCase()) || 
    item.pfrId.toLowerCase().includes(search.toLowerCase())
  );

  // ... (handleDelete and handleCsvUpload remain similar but use playerName/pfrId)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-2xl flex items-center justify-center">
            <Hash className="h-6 w-6 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">PFR Registry</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
              System Authority · {data.length} Total Players
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
             <input 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search registry..."
               className="bg-[#0f1115] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-[#FFD700]/30 w-48"
             />
           </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white transition-all"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </button>
          <input type="file" ref={fileRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
          <button
            onClick={() => setShowAdd(v => !v)}
            className="p-2 bg-[#FFD700] hover:bg-[#FFD700]/80 rounded-xl text-black transition-all"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Manual Entry Form (Slide Down) */}
      {showAdd && (
        <div className="bg-[#0f1115] border border-[#FFD700]/20 rounded-[2rem] p-6 animate-in slide-in-from-top-2 duration-300">
           {/* Form Content */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Full Player Name</label>
                <input 
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" 
                  placeholder="e.g. Lamar Jackson"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">PFR ID String</label>
                <input 
                  value={newPfr} onChange={e => setNewPfr(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-[#FFD700] font-mono" 
                  placeholder="e.g. JackLa00"
                />
              </div>
           </div>
           <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-zinc-500 text-xs font-black uppercase">Cancel</button>
              <button onClick={handleAdd} className="px-6 py-2 bg-[#FFD700] text-black rounded-lg text-xs font-black uppercase">Save Entry</button>
           </div>
        </div>
      )}

      {/* Registry Table */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-[2.5rem] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.04] bg-white/[0.02]">
              <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Player Identity</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Key</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredData.map((item) => (
              <tr key={item.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="px-8 py-4">
                  <span className="text-sm font-bold text-white uppercase italic tracking-tight">{item.playerName}</span>
                </td>
                <td className="px-8 py-4">
                  <code className="text-[11px] font-black text-[#FFD700] bg-[#FFD700]/5 px-2 py-1 rounded border border-[#FFD700]/10">
                    {item.pfrId}
                  </code>
                </td>
                <td className="px-8 py-4 text-right">
                   <button onClick={() => setDeleteId(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all">
                      <Trash2 className="h-4 w-4" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}