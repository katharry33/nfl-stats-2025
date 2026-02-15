"use client";

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { BetResult } from "@/lib/types";

// Use a mapping to reconcile display names with data values for consistency
const STATUS_MAP: Record<string, string> = {
  won: "Win",
  lost: "Loss",
  cashed: "Cashed",
  pushed: "Push",
};

const COLORS: Record<string, string> = {
  Win: "hsl(var(--chart-1))",
  Cashed: "hsl(var(--chart-2))",
  Loss: "hsl(var(--destructive))",
  Push: "hsl(var(--muted))",
};

export function BetResultsChart({ bets }: { bets: BetResult[] }) {
  const totalSettled = bets.length;

  const data = Object.entries(
    bets.reduce((acc, bet) => {
      // Normalize the status to lowercase for reliable grouping
      const normalizedStatus = bet.status?.toLowerCase() || '';
      // Use the map to get the desired display name
      const displayName = STATUS_MAP[normalizedStatus] || normalizedStatus;
      acc[displayName] = (acc[displayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalSettled) * 100).toFixed(1);
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.name}
            </span>
            <span className="font-bold text-foreground">
              {`${data.value} bets (${percentage}%)`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Bet Results ({totalSettled})</CardTitle>
        <CardDescription>Win / Loss / Cashed Breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="white"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs font-bold"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No settled bets to display.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
