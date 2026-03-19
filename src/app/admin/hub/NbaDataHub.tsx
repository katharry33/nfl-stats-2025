import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const NbaDataHub = () => {
  const [syncStats, setSyncStats] = useState<any>({});
  const [defensiveRankings, setDefensiveRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Check Schedule Counts
      const scheduleRef = collection(db, 'static_nba_schedule');
      const counts: any = {};
      
      for (const year of [2024, 2025]) {
        const q = query(scheduleRef, where('season', '==', year));
        const snap = await getDocs(q);
        counts[year] = snap.size;
      }
      setSyncStats(counts);

      // 2. Fetch Defensive Rankings (Sorted by Pts Allowed)
      const defenseRef = collection(db, 'nba_defense_stats');
      const defQuery = query(defenseRef, where('season', '==', 2025), orderBy('avgPtsAllowed', 'asc'));
      const defSnap = await getDocs(defQuery);
      setDefensiveRankings(defSnap.docs.map(doc => doc.data()));

    } catch (err) {
      console.error("Error loading Hub data:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8">🏀 NBA Admin Data Hub</h1>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[2024, 2025].map(year => (
          <div key={year} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 uppercase text-xs font-bold">Season {year} Schedule</h3>
            <p className="text-2xl font-mono mt-1">
              {syncStats[year] || 0} <span className="text-sm text-slate-500">/ {year === 2024 ? '1230' : 'Current'}</span>
            </p>
            <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min((syncStats[year] / 1230) * 100, 100)}%` }}
                />
            </div>
          </div>
        ))}
      </div>

      {/* Defensive Rankings Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">2025 Defensive Rankings (Opponent PPG)</h2>
          <button onClick={fetchData} className="text-sm bg-blue-600 px-3 py-1 rounded hover:bg-blue-500">Refresh</button>
        </div>
        <table className="w-full text-left">
          <thead className="text-xs uppercase text-slate-500 bg-slate-900/50">
            <tr>
              <th className="p-4">Team</th>
              <th className="p-4">GP</th>
              <th className="p-4">Pts Allowed</th>
              <th className="p-4">3PM Allowed</th>
              <th className="p-4">PRA Allowed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {defensiveRankings.map((team, i) => (
              <tr key={team.abbrev} className="hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-bold"><span className="text-slate-500 mr-2">{i+1}</span>{team.abbrev}</td>
                <td className="p-4 text-slate-400">{team.sampleSize}</td>
                <td className="p-4 text-green-400 font-mono">{team.avgPtsAllowed}</td>
                <td className="p-4 font-mono">{team.avgThreesAllowed}</td>
                <td className="p-4 font-mono">{team.avgPraAllowed || (team.avgPtsAllowed + team.avgRebAllowed + team.avgAstAllowed).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NbaDataHub;