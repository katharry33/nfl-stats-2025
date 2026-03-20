import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const NflAdminPage = () => {
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateDefensiveStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch Schedule (Using the collection name from our sync script)
      const scheduleSnap = await getDocs(
        query(
          collection(db, 'static_nfl_schedule'), 
          where('season', '==', 2025), 
          where('status', '==', 'closed')
        )
      );

      const games = scheduleSnap.docs.map(doc => doc.data());
      
      // 2. Aggregate Points Allowed (Since we don't have yards yet)
      const stats: any = {};

      games.forEach(game => {
        const home = game.homeTeam;
        const away = game.visitorTeam;

        if (!stats[home]) stats[home] = { ptsAllowed: 0, games: 0 };
        if (!stats[away]) stats[away] = { ptsAllowed: 0, games: 0 };

        // Points allowed by Home Team = Visitor's score
        stats[home].ptsAllowed += (game.visitorScore || 0);
        stats[home].games += 1;

        // Points allowed by Away Team = Home's score
        stats[away].ptsAllowed += (game.homeScore || 0);
        stats[away].games += 1;
      });

      // 3. Finalize Averages (Points per Game Allowed)
      const finalRankings = Object.keys(stats)
        .map(teamCode => ({
          team: teamCode,
          avgPtsAllowed: (stats[teamCode].ptsAllowed / stats[teamCode].games).toFixed(1),
          sampleSize: stats[teamCode].games
        }))
        .sort((a, b) => parseFloat(a.avgPtsAllowed) - parseFloat(b.avgPtsAllowed));

      setTeamStats(finalRankings);
    } catch (err) {
      console.error("Calculation Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { calculateDefensiveStats(); }, []);

  return (
    <div className="p-8 bg-slate-950 text-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold italic tracking-tighter text-blue-500">NFL ANALYTICS ENGINE</h1>
          <p className="text-xs text-slate-500 uppercase mt-1">Defensive Efficiency (Points Allowed)</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase">Season: 2025-26</div>
          <button 
            onClick={calculateDefensiveStats}
            className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded mt-2 hover:bg-blue-600/40 transition"
          >
            REFRESH DATA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-20 text-center text-slate-500 animate-pulse">Calculating defensive metrics...</div>
        ) : teamStats.length === 0 ? (
          <div className="p-20 text-center border border-dashed border-slate-800 rounded-lg text-slate-500">
            No "Closed" games found for 2025 yet. Sync your schedule!
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 w-16">Rank</th>
                  <th className="p-4">Team</th>
                  <th className="p-4 text-center">GP</th>
                  <th className="p-4 text-right">Avg Pts Allowed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {teamStats.map((team, index) => (
                  <tr key={team.team} className="hover:bg-blue-500/5 transition-colors">
                    <td className="p-4 text-slate-500 font-mono">{index + 1}</td>
                    <td className="p-4">
                      <span className="font-bold text-lg mr-2">{team.team}</span>
                    </td>
                    <td className="p-4 text-center text-slate-400">{team.sampleSize}</td>
                    <td className="p-4 text-right font-mono text-blue-400 text-lg">
                      {team.avgPtsAllowed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NflAdminPage;