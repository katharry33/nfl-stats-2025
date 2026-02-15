'use client';

import React from "react";
// Swapped to relative paths to clear editor red lines
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Trash2, ArrowRight, Layers } from "lucide-react";
import { useBetSlip } from "../../context/betslip-context";
import { useRouter } from "next/navigation";

export function HistoricalBetSlip() {
  const { legs, removeLeg, clearLegs } = useBetSlip();
  const router = useRouter();

  const handleGoToParlayStudio = () => {
    router.push('/parlay-studio');
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2 text-slate-100">
            <Layers className="h-5 w-5 text-emerald-500" />
            <span>Bet Slip</span>
          </div>
          {legs.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearLegs}
              className="h-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            >
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {legs.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Layers className="h-6 w-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">
              No props selected. Add legs from the table to build your parlay.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {legs.map((leg) => {
                const numericOdds = Number(leg.odds);
                // Use propId falling back to id if necessary for the key
                const uniqueKey = leg.propId || leg.id || Math.random().toString();
                
                return (
                  <div
                    key={uniqueKey}
                    className="group flex items-start justify-between gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-100 truncate">{leg.player}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold px-1 rounded bg-slate-800 text-slate-400 uppercase">
                          {leg.selection}
                        </span>
                        <p className="text-xs text-slate-400">
                          {leg.prop} {leg.line}
                        </p>
                      </div>
                      <p className="text-xs font-mono text-emerald-500 mt-1">
                        Odds: {numericOdds > 0 ? '+' : ''}{numericOdds}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLeg(leg.propId || leg.id || '')}
                      className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Legs:</span>
                <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {legs.length}
                </span>
              </div>
              
              <Button 
                onClick={handleGoToParlayStudio} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                size="lg"
              >
                Parlay Studio
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}