"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DebugDashboardProps {
  data: any;
}

export function DebugDashboard({ data }: DebugDashboardProps) {
  // Defensive check for missing data
  if (!data || !data.performanceMetrics) {
    return (
      <Card className="m-4">
        <CardContent className="p-6 text-slate-500">
          No debug performance metrics available.
        </CardContent>
      </Card>
    );
  }

  // 1. Safely extract and normalize step timings
  const stepTimings = data.performanceMetrics.stepTimings || {};
  const timingEntries = Object.entries(stepTimings);

  // 2. Pre-calculate the maximum timing to avoid "unknown" arithmetic errors in the JSX
  // We map values to Number() to ensure Math.max is processing a number array
  const numericValues = Object.values(stepTimings).map(v => Number(v));
  const maxTime = Math.max(...numericValues, 1); // Use 1 as a floor to prevent division by zero

  return (
    <Card className="m-4 bg-slate-950 text-slate-50 font-mono text-xs border-slate-800">
      <CardHeader className="border-b border-slate-800 py-3">
        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          System Performance Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        
        {/* Step Timings Visualization */}
        <div>
          <h4 className="text-slate-500 mb-3 uppercase text-[10px] font-bold">
            Execution Breakdown
          </h4>
          <div className="space-y-3">
            {timingEntries.map(([step, time]) => {
              const numericTime = Number(time);
              // Calculate width percentage safely
              const percentage = (numericTime / maxTime) * 100;
              
              return (
                <div key={step} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-300 truncate max-w-[200px]">{step}</span>
                    <span className="text-blue-400 font-bold">{numericTime.toFixed(2)}ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals and Metadata */}
        <div className="pt-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 uppercase text-[9px] block mb-1">
                Total Time
              </span>
              <p className="text-lg font-black text-emerald-400">
                {Number(data.performanceMetrics.totalTime || 0).toFixed(2)}
                <span className="text-[10px] ml-0.5 text-emerald-600">ms</span>
              </p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 uppercase text-[9px] block mb-1">
                Memory Usage
              </span>
              <p className="text-lg font-black text-blue-400">
                {data.performanceMetrics.memoryUsage || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-[9px] text-slate-600 italic">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Telemetry Active
        </div>
      </CardContent>
    </Card>
  );
}