'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast"; // Ensure this path is correct
import { Loader2, CheckCircle, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NBAArchiveGraderProps {
  date: string;
  onComplete?: () => void;
}

export default function NBAArchiveGrader({ date, onComplete }: NBAArchiveGraderProps) {
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  const { toast } = useToast();

  const handleGrade = async () => {
    setLoading(true);
    
    // FIXED: Corrected toast object properties
    toast({
      title: "Grading Started",
      description: `Syncing results for ${date}...`,
    });

    try {
      const res = await fetch('/api/nba/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, season: 2025, force }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed");

      toast({
        title: "Grading Complete",
        description: `Updated ${data.gradedPerm || 0} props successfully.`,
      });

      if (onComplete) onComplete();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Grading Error",
        description: String(err.message),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-6 p-4 bg-zinc-900/50 border border-white/5 rounded-[24px]">
      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <ShieldAlert size={12} /> Post-Game Scoring
        </h3>
        <p className="text-[9px] text-zinc-500 font-bold uppercase">Target: {date}</p>
      </div>

      <div className="h-8 w-px bg-white/5" /> {/* FIXED: w-px instead of w-[1px] */}

      <div className="flex items-center space-x-2">
        <Switch id="force-mode" checked={force} onCheckedChange={setForce} />
        <Label htmlFor="force-mode" className="text-[9px] font-black text-zinc-400 uppercase cursor-pointer">
          Force
        </Label>
      </div>

      <Button
        onClick={handleGrade}
        disabled={loading}
        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {loading ? <Loader2 className="animate-spin" size={14} /> : "Grade Slate"}
      </Button>
    </div>
  );
}
