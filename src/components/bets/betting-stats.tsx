'use client';
import { useMemo } from 'react';
import { Bet } from '@/lib/types';
import { DollarSign, Percent, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color = 'text-slate-300', format = 'number' }: any) {
  const formattedValue = useMemo(() => {
      if (value === null || isNaN(value)) return '—';
          if (format === 'money') return `$${value.toFixed(2)}`;
              if (format === 'percent') return `${value.toFixed(1)}%`;
                  return value.toLocaleString();
                    }, [value, format]);

                      return (
                          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                                <div className={`p-2 bg-slate-800 border border-slate-700/80 rounded-lg mt-1 ${color}`}>
                                        <Icon className="h-5 w-5" />
                                              </div>
                                                    <div>
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</p>
                                                                    <p className={`text-2xl font-bold font-mono tracking-tight ${color}`}>{formattedValue}</p>
                                                                          </div>
                                                                              </div>
                                                                                );
                                                                                }

                                                                                export default function BettingStats({ bets }: { bets: Bet[] }) {
                                                                                  const stats = useMemo(() => {
                                                                                      const totalBets = bets.length;
                                                                                          
                                                                                              const settled = bets.filter((b) => 
                                                                                                    b.status && // Ensure status is not null/undefined
                                                                                                          b.status.toLowerCase() !== "pending" && 
                                                                                                                b.status.toLowerCase() !== "void" && 
                                                                                                                      b.status.toLowerCase() !== "push"
                                                                                                                          );

                                                                                                                              const totalWagered = settled.reduce((sum, b) => sum + (b.stake ?? 0), 0);

                                                                                                                                  const won = settled.filter(b => ['won', 'cashed'].includes(b.status.toLowerCase()));
                                                                                                                                      const lost = settled.filter(b => b.status.toLowerCase() === 'lost');

                                                                                                                                          const netProfit = settled.reduce((sum, b) => sum + (b.profit ?? 0), 0);

                                                                                                                                              const winLossCount = won.length + lost.length;
                                                                                                                                                  const winRate = winLossCount > 0 ? (won.length / winLossCount) * 100 : 0;
                                                                                                                                                      const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

                                                                                                                                                          return { totalBets, totalWagered, netProfit, winRate, roi };
                                                                                                                                                            }, [bets]);

                                                                                                                                                              const getProfitColor = (profit: number) => {
                                                                                                                                                                  if (profit > 0) return 'text-emerald-400';
                                                                                                                                                                      if (profit < 0) return 'text-red-400';
                                                                                                                                                                          return 'text-slate-300';
                                                                                                                                                                            };

                                                                                                                                                                              const getProfitIcon = (profit: number) => {
                                                                                                                                                                                  if (profit > 0) return TrendingUp;
                                                                                                                                                                                      if (profit < 0) return TrendingDown;
                                                                                                                                                                                          return Minus;
                                                                                                                                                                                            };

                                                                                                                                                                                              return (
                                                                                                                                                                                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                                                                                                                                                        <StatCard title="Net Profit" value={stats.netProfit} icon={getProfitIcon(stats.netProfit)} color={getProfitColor(stats.netProfit)} format="money" />
                                                                                                                                                                                                              <StatCard title="Win Rate" value={stats.winRate} icon={Percent} color="text-blue-400" format="percent" />
                                                                                                                                                                                                                    <StatCard title="ROI" value={stats.roi} icon={getProfitIcon(stats.roi)} color={getProfitColor(stats.roi)} format="percent" />
                                                                                                                                                                                                                          <StatCard title="Total Wagered" value={stats.totalWagered} icon={DollarSign} color="text-amber-400" format="money" />
                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                