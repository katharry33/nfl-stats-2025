'use client';
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  profit: number;
}

interface ProfitChartProps {
  data: ChartData[];
}

export function ProfitChart({ data }: ProfitChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-card rounded-xl border-border">
        <p className="text-muted-foreground">Not enough data to display a chart.</p>
      </div>
    );
  }

  const isProfit = data[data.length - 1]?.profit >= 0;
  const strokeColor = isProfit ? '#22c55e' : '#ef4444'; // emerald-500 or red-500
  const fillColor = isProfit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div className="h-80 w-full bg-card p-4 rounded-xl border border-border">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis 
            dataKey="date"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(str) => {
              const date = new Date(str);
              if (isNaN(date.getTime())) return '';
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111111', 
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="profit" 
            stroke={strokeColor}
            fill={fillColor}
            strokeWidth={2}
            dot={{ r: 1 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
