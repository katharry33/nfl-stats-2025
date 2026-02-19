'use client';

import { useBetSlip } from '@/context/betslip-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { BetLeg } from '@/lib/types';
import { useRouter } from 'next/navigation';

// The card now receives the remove function as a prop and does not call the hook itself.
function BetLegCard({ leg, removeFromSlip }: { leg: BetLeg; removeFromSlip: (id: string) => void }) {
  return (
    <div className="bg-slate-800 p-3 rounded-lg text-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-white">{leg.player}</p>
          <p className="text-xs text-slate-400">{leg.prop}</p>
        </div>
        <button onClick={() => removeFromSlip(leg.id)} className="text-slate-500 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
        <div className="font-mono text-xs bg-slate-900 px-2 py-1 rounded">
          {leg.selection} {leg.line} 
        </div>
        <div className="font-bold text-yellow-400">
          {Number(leg.odds) > 0 ? `+${leg.odds}` : leg.odds}
        </div>
      </div>
    </div>
  );
}

// The main BetSlip component
export function BetSlip() {
  const router = useRouter();
  const { 
    selections: slip, 
    removeLeg: removeFromSlip, 
    clearSlip 
  } = useBetSlip();

  if (slip.length === 0) {
    return null;
  }

  const handleGoToStudio = () => {
    router.push('/parlay-studio');
  };

  return (
    <aside className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col p-4 animate-slide-in-from-right">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">Bet Slip</h2>
        <Button variant="ghost" size="sm" onClick={clearSlip} className="text-slate-400 hover:bg-slate-800">
          Clear All
        </Button>
      </div>

      <div className="flex-1 py-4 space-y-3 overflow-y-auto">
        {/* Pass the remove function down to each card as a prop. */}
        {slip.map(leg => (
          <BetLegCard key={leg.id} leg={leg} removeFromSlip={removeFromSlip} />
        ))}
      </div>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-slate-400">Total Legs</span>
          <span className="font-bold text-white">{slip.length}</span>
        </div>
        <Button onClick={handleGoToStudio} className="w-full bg-yellow-400 text-black font-bold hover:bg-yellow-500">
          Go to Parlay Studio
        </Button>
      </div>
    </aside>
  );
}
