'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Database, Info, FileDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Papa from 'papaparse';

interface NBAIngestToolsProps {
  onComplete?: () => void;
}

export default function NBAIngestTools({ onComplete }: NBAIngestToolsProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const { toast } = useToast();

  const REQUIRED_HEADERS = ['player', 'matchup', 'team', 'line', 'prop', 'odds'];

  // Simulation for UX
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && progress < 90) {
      interval = setInterval(() => {
        setProgress(prev => prev + (90 - prev) * 0.1);
      }, 400);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(5);
    setStatus("Validating CSV...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      
      try {
        const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        
        if (!parsed.data || parsed.data.length === 0) {
          throw new Error("CSV file is empty.");
        }

        const headers = Object.keys(parsed.data[0] || {}).map(h => h.toLowerCase().trim());
        const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        if (missing.length > 0) {
          // FIXED: String interpolation to avoid passing object to toast
          toast({
            variant: "destructive",
            title: "Invalid Headers",
            description: `Missing: ${missing.join(', ')}`,
          });
          setLoading(false);
          return;
        }

        setStatus("Syncing with Firestore...");
        
        // Ensure we tag these props with today's date
        const today = new Date().toISOString().split('T')[0];

        const res = await fetch('/api/nba/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            csvString, 
            season: "2025", 
            date: today 
          }),
        });

        const result = await res.json();
        
        if (!res.ok) {
          // FIXED: Ensure error description is ALWAYS a string
          const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
          throw new Error(errorMsg || "Server Error");
        }

        setProgress(100);
        setStatus("Complete!");
        
        toast({
          title: "Slate Seeded Successfully",
          description: `Imported ${result.success || 0} props for ${today}.`,
        });

        if (onComplete) onComplete();
      } catch (err: any) {
        console.error("Ingest Error:", err);
        toast({
          variant: "destructive",
          title: "Sync Failed",
          // FIXED: Final safeguard against "Object as React child"
          description: String(err.message || "Unexpected error during upload."),
        });
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
          setStatus("Idle");
        }, 1200);
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
          <div className="px-1 animate-in fade-in slide-in-from-top-1">
            <Progress value={progress} className="h-1 bg-white/5" />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}