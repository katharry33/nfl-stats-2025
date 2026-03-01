'use client';

import React, { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";

export default function PlayerTeamsPage() {
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/static-data?type=player-team')
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#060606] p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl flex items-center justify-center">
          <Users className="h-4 w-4 text-[#FFD700]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
            Player → Team
          </h1>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Static Data</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full">
          <thead className="border-b border-white/[0.06]">
            <tr>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                Player Name
              </th>
              <th className="px-5 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                Team
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FFD700] mx-auto" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-16 text-center text-zinc-600 text-sm">No data found.</td>
              </tr>
            ) : (
              data.map((item: any, i: number) => (
                <tr key={item.id ?? i}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-bold text-white italic uppercase tracking-tight">
                    {item.PlayerName}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-black text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                      {item.Team}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}