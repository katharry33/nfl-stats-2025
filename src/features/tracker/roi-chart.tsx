'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { getPayout } from "../../lib/utils";
import type { Bet } from "../../lib/types";

const chartConfig = {
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function RoiChart({ bets }: { bets: Bet[] }) {
  const processChartData = () => {
    const monthlyData: { [key: string]: { profit: number } } = {
      "Sep 2025": { profit: 0 },
      "Oct 2025": { profit: 0 },
      "Nov 2025": { profit: 0 },
      "Dec 2025": { profit: 0 },
      "Jan 2026": { profit: 0 },
    };

    bets.forEach((bet) => {
      const status = bet.status.toLowerCase();
      if (status === "pending" || !bet.createdAt) return;

      const date = new Date(bet.createdAt);
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const key = `${month} ${year}`;

      if (key in monthlyData) {
        const stake = Number(bet.stake) || 0;
        const odds = parseFloat(String(bet.odds)) || 0;

        switch (status) {
          case "won":
            monthlyData[key].profit += getPayout(stake, odds);
            break;
          case "lost":
            monthlyData[key].profit -= stake;
            break;
          case "cashed":
            const cashedAmount = Number((bet as any).cashedAmount) || stake;
            monthlyData[key].profit += cashedAmount - stake;
            break;
          case "push":
          case "void":
            break;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      profit: parseFloat(data.profit.toFixed(2)),
    }));
  };

  const chartData = processChartData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Return on Investment (ROI)</CardTitle>
        <CardDescription>Monthly Net Profit: Sep 2025 - Jan 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis tickFormatter={(value: number) => `$${value}`} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value: any) => [`$${Number(value)}`, "Profit"]} />}
            />
            <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
