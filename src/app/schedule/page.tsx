import { getStaticSchedule } from '@/lib/firebase/server/queries';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const schedule = await getStaticSchedule();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black uppercase mb-6">NFL Schedule</h1>
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-4">Week</th>
              <th className="p-4">Date</th>
              <th className="p-4">Matchup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {schedule.map((game) => (
              <tr key={game.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-mono">{game.week}</td>
                <td className="p-4 text-slate-300">
                  {new Date(game.gameDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="p-4 font-bold">
                  {game.awayTeam} @ {game.homeTeam}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}