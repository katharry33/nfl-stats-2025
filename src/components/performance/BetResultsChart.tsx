'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function BetResultsChart({ bets }: { bets: any[] }) {
  const data = bets.reduce((acc, bet) => {
    const month = new Date(bet.createdAt).toLocaleString('default', { month: 'short' });
    if (!acc[month]) {
      acc[month] = { month, won: 0, lost: 0 };
    }
    if (bet.status === 'won') {
      acc[month].won += 1;
    } else if (bet.status === 'lost') {
      acc[month].lost += 1;
    }
    return acc;
  }, {} as any);

  return (
    <div className="bg-slate-900 p-4 rounded-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Bet Results</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={Object.values(data)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Bar dataKey="won" fill="#10B981" />
          <Bar dataKey="lost" fill="#EF4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
