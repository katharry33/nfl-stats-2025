'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Search, Upload, Download, Loader2, Table } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

export function ScheduleTab({ sport, season, theme }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const isNBA = sport === 'NBA';

  // --- Template Generator ---
  const downloadTemplate = () => {
    const headers = isNBA 
      ? ['date', 'time', 'away_team', 'home_team', 'arena', 'is_postseason']
      : ['week', 'day', 'date', 'game_time', 'away_team', 'home_team'];
    
    const sampleRow = isNBA
      ? ['2025-10-24', '7:30 PM', 'Boston Celtics', 'New York Knicks', 'Madison Square Garden', 'false']
      : ['1', 'Thu', '2024-09-05', '8:20 PM', 'Baltimore Ravens', 'Kansas City Chiefs'];

    const csv = Papa.unparse([headers, sampleRow]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${sport}_Schedule_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          // Determine correct collection
          const colName = isNBA 
            ? 'static_nba_schedule' 
            : (season === 2024 ? 'static_nfl_schedule_24' : 'static_nfl_schedule');
          
          results.data.forEach((row: any) => {
            // Validate essential fields
            if (!row.home_team || !row.date) return;

            const gameId = `${row.away_team}_at_${row.home_team}_${row.date}`.replace(/\s+/g, '_');
            const docRef = doc(collection(db, colName), gameId);
            
            const baseData: any = {
              date: row.date,
              gameTime: row.game_time || row.time,
              awayTeam: row.away_team,
              homeTeam: row.home_team,
              season: season,
              status: 'scheduled',
              updatedAt: new Date().toISOString()
            };

            if (isNBA) {
              baseData.arena = row.arena || 'TBD';
              baseData.isPostseason = row.is_postseason === 'true';
            } else {
              baseData.week = row.week;
              baseData.day = row.day;
            }

            batch.set(docRef, baseData, { merge: true });
          });

          await batch.commit();
          toast.success(`Imported ${results.data.length} ${sport} games`);
        } catch (err) {
          toast.error("Upload failed");
          console.error(err);
        } finally {
          setIsUploading(false);
          e.target.value = ''; // Reset input
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white/2 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Table size={16} className="text-slate-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {sport} Schedule Manager
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Download Template Button */}
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/10 rounded-xl hover:bg-white/5 transition-all"
          >
            <Download size={14} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Template</span>
          </button>

          {/* Upload Button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl cursor-pointer hover:bg-cyan-500/20 transition-all group">
            {isUploading ? (
              <Loader2 size={14} className="animate-spin text-cyan-400" />
            ) : (
              <Upload size={14} className="text-cyan-400" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Upload CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>
      
      {/* Rest of your Table UI here... */}
    </div>
  );
}