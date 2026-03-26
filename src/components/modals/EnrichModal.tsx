'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Database, Zap, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';
import { PropData } from '@/lib/types';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  league: 'nba' | 'nfl';
  defaultDate: string;
  defaultSeason: number;
  props?: PropData[]; // Optional: for previewing existing data
}

export function IngestEnrichModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  league, 
  defaultDate, 
  defaultSeason 
}: IngestModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        toast.error("Invalid File", { description: "Please upload a .csv file." });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => setCsvContent(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleProcess = async () => {
    setIsUploading(true);
    
    // Determine the target context
    const today = new Date().toISOString().split('T')[0];
    const currentNFLWeek = getCurrentNFLWeek(defaultSeason);
    
    // Is this "Live" data?
    const isLiveNBA = league === 'nba' && defaultDate === today;
    const isLiveNFL = league === 'nfl' && Number(getCurrentNFLWeek(defaultSeason)) === currentNFLWeek; 
    const isLive = isLiveNBA || isLiveNFL;

    try {
      const response = await fetch(`/api/${league}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: csvContent ? 'manual' : 'auto', 
          date: defaultDate,
          league,
          season: defaultSeason,
          week: league === 'nfl' ? currentNFLWeek : undefined,
          csvString: csvContent
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Ingest Protocol Failed');

      if (isLive) {
        toast.success("Live Protocol Active", { 
          description: "Data synchronized. Redirecting to Bet Builder for analysis...",
          action: {
            label: "Go Now",
            onClick: () => router.push('/bet-builder')
          },
          duration: 5000,
        });
        setTimeout(() => {
            onClose();
            router.push('/bet-builder');
        }, 1500);
      } else {
        toast.success("Vault Synchronized", { 
          description: `Successfully enriched ${result.count || 'the'} records in the archive.`,
        });
        onComplete();
        onClose();
      }

    } catch (error: any) {
      console.error("Ingest Error:", error);
      toast.error("Process Error", { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#121214] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
              <Database className="text-orange-500" size={20} />
              Data <span className="text-orange-500">Ingest</span>
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              {league} Protocol • Season {defaultSeason}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Upload Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`group border-2 border-dashed rounded-[24px] p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
              csvContent 
                ? 'border-emerald-500/40 bg-emerald-500/5' 
                : 'border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 bg-black/20'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv" 
              className="hidden" 
            />
            
            {csvContent ? (
              <>
                <div className="bg-emerald-500/20 p-4 rounded-2xl">
                    <FileText className="text-emerald-500" size={32} />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-white uppercase italic">CSV Staged for Ingest</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCsvContent(null); }} 
                        className="text-[10px] text-zinc-500 hover:text-red-400 uppercase font-black mt-2 underline underline-offset-4"
                    >
                        Remove and use Auto-Scraper
                    </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/5 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                    <Upload className="text-zinc-500 group-hover:text-orange-500" size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-zinc-300 uppercase italic">Drop CSV or Click to Browse</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">
                    Manual override for {league} lines
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Context Info Box */}
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
            <div className="flex items-start gap-3 text-zinc-400">
              <Zap size={16} className="text-orange-500 mt-1 shrink-0" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-300 uppercase">
                    Target: <span className="text-white">{league === 'nba' ? defaultDate : `Week ${getCurrentNFLWeek(defaultSeason)}`}</span>
                </p>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                    This will synchronize existing records with latest market data. 
                    {csvContent ? " Using manual file input." : " Using automated projection engines."}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleProcess}
            disabled={isUploading}
            className="group w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-5 rounded-[20px] font-black uppercase italic tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-orange-900/20"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Synchronizing...
              </span>
            ) : (
              <>
                Commit to {league} Vault
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}