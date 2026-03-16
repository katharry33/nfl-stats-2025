'use client';

import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, ReferenceLine } from 'recharts';

interface PnLSparklineProps {
  data: { name: string; profit: number }[];
  height?: number;
}

export function PnLSparkline({ data, height = 120 }: PnLSparklineProps) {
  // Calculate cumulative profit for the area chart
  let runningTotal = 0;
  const cumulativeData = data.map(d => {
    runningTotal += d.profit;
    return { ...d, cumulative: runningTotal };
  });

  const isUp = runningTotal >= 0;
  const strokeColor = isUp ? '#10b981' : '#ef4444';
  const fillColor = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={cumulativeData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const val = payload[0].value as number;
              return (
                <div className="bg-[#0a0c0f] border border-white/10 rounded-lg px-2 py-1 shadow-2xl">
                  <p className="text-[10px] font-mono font-bold" style={{ color: strokeColor }}>
                    ${val.toFixed(2)}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#chartGradient)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}