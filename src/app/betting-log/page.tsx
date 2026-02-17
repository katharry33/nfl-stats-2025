import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBettingLog } from "@/lib/firebase/server/queries";
import { Bet, BetLeg } from "@/lib/types";

export default async function BettingLogPage() {
  // 1. Get the real authenticated user from Clerk
  const { userId } = await auth();

  // 2. Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // 3. Fetch normalized and grouped bets from your server query
  const bets: Bet[] = await getBettingLog(userId);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Betting History</h1>
        <p className="text-gray-500 text-sm">Review your past performance and legacy parlays.</p>
      </header>

      {bets.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
          <p className="text-gray-400">No bets found in your history.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bets.map((bet) => (
            <div 
              key={bet.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700 uppercase tracking-wide text-sm">
                      {bet.betType || 'Straight'}
                    </span>
                    {bet.boost && (
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                        Boosted
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 mt-1">
                    REF: {bet.id.slice(-12).toUpperCase()}
                  </p>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${
                  bet.status === 'won' ? 'bg-green-100 text-green-700' : 
                  bet.status === 'lost' ? 'bg-red-100 text-red-700' : 
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {bet.status}
                </div>
              </div>

              {/* Legs Section */}
              <div className="p-4 space-y-4">
                {bet.legs && bet.legs.length > 0 ? (
                  bet.legs.map((leg, idx) => (
                    <div key={leg.id || idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 leading-tight">
                          {leg.player}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 italic">
                          {leg.matchup} • {leg.prop}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-gray-800">
                          {leg.selection} {leg.line}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          ({typeof leg.odds === 'number' && leg.odds > 0 ? `+${leg.odds}` : leg.odds})
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">Leg data unavailable for this entry.</p>
                )}
              </div>

              {/* Financial Footer */}
              <div className="bg-gray-50/50 px-4 py-3 border-t grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-400 font-bold">Stake</span>
                  <span className="font-bold text-gray-900">${Number(bet.stake).toFixed(2)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase text-gray-400 font-bold">Payout</span>
                  <span className={`font-bold ${bet.status === 'won' ? 'text-green-600' : 'text-gray-900'}`}>
                    ${Number(bet.payout || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}