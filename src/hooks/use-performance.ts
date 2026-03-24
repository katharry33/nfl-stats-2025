// src/hooks/use-performance.ts
'use client';

import { useMemo } from "react";

export function usePerformance(bets: any[], loadingBets: boolean) {
  const stats = useMemo(() => {
    if (!bets || bets.length === 0) {
      return {
        totalProfit: 0,
        totalWagered: 0,
        winRate: 0,
        roi: 0,
        chartData: [],
        settledCount: 0,
        winCount: 0,
        totalBets: 0,
        rawBets: [],
        avgEdge: 0,
        avgConfidence: 0,
        avgCLV: 0,
        avgEV: 0,
        profitByPropType: {},
        profitByTeam: {},
        profitByPlayer: {},
        hitRateByPropType: {},
        hitRateByTeam: {},
        hitRateByPlayer: {},
        bestPropType: null,
        worstPropType: null,
        bestPlayer: null,
        worstPlayer: null,
      };
    }

    const settled = bets.filter(b => b.status !== "Pending");
    const wins = settled.filter(b => b.status === "Win" || b.status === "Cashed");

    const totalProfit = settled.reduce((sum, b) => sum + (b.profit ?? 0), 0);
    const totalWagered = settled.reduce((sum, b) => sum + (b.stake ?? 0), 0);

    const winRate = settled.length ? (wins.length / settled.length) * 100 : 0;
    const roi = totalWagered ? (totalProfit / totalWagered) * 100 : 0;

    const avgEdge = average(bets.map(b => b.edgePct ?? 0));
    const avgConfidence = average(bets.map(b => b.confidenceScore ?? 0));
    const avgCLV = average(bets.map(b => b.closingLineValue ?? 0));
    const avgEV = average(bets.map(b => b.expectedValue ?? 0));

    const profitByPropType = groupSum(bets, "propType", "profit");
    const profitByTeam = groupSum(bets, "team", "profit");
    const profitByPlayer = groupSum(bets, "player", "profit");

    const hitRateByPropType = groupHitRate(bets, "propType");
    const hitRateByTeam = groupHitRate(bets, "team");
    const hitRateByPlayer = groupHitRate(bets, "player");

    const bestPropType = bestKey(profitByPropType);
    const worstPropType = worstKey(profitByPropType);

    const bestPlayer = bestKey(profitByPlayer);
    const worstPlayer = worstKey(profitByPlayer);

    return {
      totalProfit,
      totalWagered,
      winRate,
      roi,
      chartData: buildChartData(settled),
      settledCount: settled.length,
      winCount: wins.length,
      totalBets: bets.length,
      rawBets: bets,
      avgEdge,
      avgConfidence,
      avgCLV,
      avgEV,
      profitByPropType,
      profitByTeam,
      profitByPlayer,
      hitRateByPropType,
      hitRateByTeam,
      hitRateByPlayer,
      bestPropType,
      worstPropType,
      bestPlayer,
      worstPlayer,
    };
  }, [bets]);

  return { stats, loading: loadingBets };
}

// --- helpers ---
function average(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function groupSum(arr: any[], key: string, field: string) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? "Unknown";
    acc[k] = (acc[k] ?? 0) + (item[field] ?? 0);
    return acc;
  }, {} as Record<string, number>);
}

function groupHitRate(arr: any[], key: string) {
  const groups: Record<string, { wins: number; total: number }> = {};

  arr.forEach(b => {
    const k = b[key] ?? "Unknown";
    if (!groups[k]) groups[k] = { wins: 0, total: 0 };
    if (b.status === "Win" || b.status === "Cashed") groups[k].wins++;
    if (b.status !== "Pending") groups[k].total++;
  });

  return Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [
      k,
      v.total ? (v.wins / v.total) * 100 : 0,
    ])
  );
}

function bestKey(obj: Record<string, number>) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function worstKey(obj: Record<string, number>) {
  return Object.entries(obj).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}

function buildChartData(bets: any[]) {
  return bets.map(b => ({
    name: b.date ?? "",
    profit: b.profit,
  }));
}
