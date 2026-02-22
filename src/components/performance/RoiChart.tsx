'use client';

import { 
  Bar, 
  Line, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer 
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "../../components/ui/chart";
import { calculateNetProfit } from "../../lib/utils";
import type { Bet } from "../../lib/types";

const chartConfig = {
  profit: {
    label: "Monthly Profit",
    color: "hsl(var(--emerald-500))",
  },
  cumulative: {
    label: "Total Growth",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function RoiChart({ bets }: { bets: Bet[] }) {
  const processChartData = () => {
    const monthlyData: { [key: string]: { profit: number } } = {};

    // 1. Group by month
    bets.forEach((bet) => {
      const status = bet.status?.toLowerCase();
      if (!status || status === "pending") return;

      const dateSource = bet.createdAt || bet.date || bet.manualDate;
      if (!dateSource) return;

      const date = dateSource.seconds 
        ? new Date(dateSource.seconds * 1000) 
        : new Date(dateSource);

      if (isNaN(date.getTime())) return;

      const key = date.toLocaleString("default", { month: "short", year: "numeric" });
      if (!monthlyData[key]) monthlyData[key] = { profit: 0 };

      const stake = Number(bet.stake) || 0;

      if (status === "won") {
        monthlyData[key].profit += calculateNetProfit(stake, bet.odds);
      } else if (status === "lost") {
        monthlyData[key].profit -= stake;
      } else if (status.includes("cashed")) {
        const cashedAmount = Number(bet.cashedOutAmount || bet.cashedAmount) || 0;
        monthlyData[key].profit += (cashedAmount - stake);
      }
    });

    // 2. Sort and Calculate Cumulative
    let runningTotal = 0;
    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, data]) => {
        runningTotal += data.profit;
        return {
          month,
          profit: parseFloat(data.profit.toFixed(2)),
          cumulative: parseFloat(runningTotal.toFixed(2)),
          fill: data.profit >= 0 ? "#10b981" : "#f43f5e" // emerald-500 : rose-500
        };
      });
  };

  const chartData = processChartData();

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Equity Curve</CardTitle>
          <CardDescription>Monthly Profit vs. Cumulative Growth</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} stroke="#1e293b" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
            />
            {/* Primary Axis for Profit Bars */}
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent className="bg-slate-950 border-slate-800" />}
            />
            {/* Bars for individual monthly wins/losses */}
            <Bar dataKey="profit" radius={[4, 4, 0, 0]} barSize={40} />
            
            {/* 🚩 The Line for total bankroll growth */}
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#6366f1" // indigo-500
              strokeWidth={3}
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
