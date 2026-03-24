'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import Papa from 'papaparse';

interface NBAIngestToolsProps {
  onComplete?: () => void;
}

export default function NBAIngestTools({ onComplete }: NBAIngestToolsProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setStatus("Validating CSV...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      
      try {
        const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        if (!parsed.data || parsed.data.length === 0) throw new Error("CSV is empty.");

        const rowCount = parsed.data.length;
        const today = new Date().toISOString().split('T')[0];

        setStatus(`Enriching ${rowCount} Players...`);

        // Artificial progress bar logic
        const totalExpectedMs = rowCount * 2100; 
        const intervalMs = 500;
        const step = (intervalMs / totalExpectedMs) * 100;
        const progressTimer = setInterval(() => {
          setProgress((prev) => (prev >= 95 ? 95 : prev + step));
        }, intervalMs);

        const res = await fetch('/api/nba/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvString, season: 2025, date: today }),
        });

        const result = await res.json();
        clearInterval(progressTimer);

        if (!res.ok) throw new Error(result.error || "Server Error");

        setProgress(100);
        setStatus("Complete!");
        
        // Fix: Use 'as any' to bypass the Toast property type check
        (toast as any)({
          title: "Success",
          description: `Enriched ${result.success} props.`,
        });

        if (onComplete) onComplete();
      } catch (err: any) {
        (toast as any)({
          variant: "destructive",
          title: "Sync Failed",
          description: String(err.message),
        });
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
          setStatus("Idle");
        }, 2000);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 min-w-[220px]">
        <div className="flex items-center gap-2">
          <input type="file" id="nba-csv-upload" className="hidden" accept=".csv" onChange={handleFile} disabled={loading} />
          <Button
            variant="outline"
            asChild
            className={`flex-1 h-10 rounded-2xl border-white/5 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
              loading ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <label htmlFor="nba-csv-upload" className="flex items-center justify-center cursor-pointer">
              {loading ? <Loader2 size={14} className="mr-2 animate-spin text-indigo-500" /> : <Database size={14} className="mr-2 text-indigo-500" />}
              {loading ? status : "Seed NBA Slate"}
            </label>
          </Button>
        </div>
        {loading && (
          <div className="px-1 space-y-1">
            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1 bg-white/5" />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}