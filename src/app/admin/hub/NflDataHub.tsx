import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

const NflAdminPage = () => {
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateDefensiveStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch the ID Map and the Schedule
      const [mapSnap, scheduleSnap] = await Promise.all([
        getDocs(collection(db, 'static_pfrIdMap')),
        getDocs(query(collection(db, 'static_schedule'), where('season', '==', 2025), where('status', '==', 'closed')))
      ]);

      const idMap = mapSnap.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data().pfrId; // e.g., { "Philadelphia Eagles": "PHI" }
        return acc;
      }, {});

      const games = scheduleSnap.docs.map(doc => doc.data());
      
      // 2. Aggregate Yards Allowed per Team
      const stats: any = {};

      games.forEach(game => {
        const homeTeam = game.homeTeam;
        const awayTeam = game.awayTeam;

        if (!stats[homeTeam]) stats[homeTeam] = { totalYdsAllowed: 0, games: 0 };
        if (!stats[awayTeam]) stats[awayTeam] = { totalYdsAllowed: 0, games: 0 };

        // For the Home Team, yards allowed = Away Team's total yards
        stats[homeTeam].totalYdsAllowed += game.awayTeamStats.totalYards;
        stats[homeTeam].games += 1;

        // For the Away Team, yards allowed = Home Team's total yards
        stats[awayTeam].totalYdsAllowed += game.homeTeamStats.totalYards;
        stats[awayTeam].games += 1;
      });

      // 3. Finalize Averages
      const finalRankings = Object.keys(stats).map(teamName => ({
        team: teamName,
        pfrId: idMap[teamName] || 'N/A',
        avgYdsAllowed: (stats[teamName].totalYdsAllowed / stats[teamName].games).toFixed(1),
        sampleSize: stats[teamName].games
      })).sort((a, b) => parseFloat(a.avgYdsAllowed) - parseFloat(b.avgYdsAllowed));

      setTeamStats(finalRankings);
    } catch (err) {
      console.error("Calculation Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { calculateDefensiveStats(); }, []);

  return (
    <div className="p-8 bg-slate-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold italic tracking-tighter">NFL ANALYTICS ENGINE</h1>
        <div className="text-xs text-slate-500 uppercase">Season: 2025-26 (Live)</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Team</th>
                <th className="p-4 text-center">GP</th>
                <th className="p-4 text-right">Avg Yds Allowed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {teamStats.map((team, index) => (
                <tr key={team.team} className="hover:bg-blue-900/10">
                  <td className="p-4 text-slate-500">{index + 1}</td>
                  <td className="p-4 font-semibold">{team.pfrId} <span className="text-slate-500 font-normal text-xs ml-2">{team.team}</span></td>
                  <td className="p-4 text-center">{team.sampleSize}</td>
                  <td className="p-4 text-right font-mono text-blue-400">{team.avgYdsAllowed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NflAdminPage;