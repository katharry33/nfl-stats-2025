'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function RoiChart({ bets }: { bets: any[] }) {
  const data = bets.map(bet => ({
    date: new Date(bet.createdAt).toLocaleDateString(),
    roi: ((bet.status === 'won' ? bet.stake * (bet.odds / 100) : -bet.stake) / bet.stake) * 100,
  }));

  return (
    <div className="bg-slate-900 p-4 rounded-lg">
      <h2 className="text-lg font-semibold text-white mb-4">ROI Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey="roi" stroke="#3B82F6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
