import { useState, useEffect } from 'react';
import { X, DollarSign, Hash, TrendingUp, Trophy, Calendar, Trash2, Layers } from 'lucide-react';
import { Bet, BetLeg, resolveFirestoreDate } from '@/lib/types';

interface EditBetModalProps {
  isOpen: boolean;
  bet: Bet | null;
  onClose: () => void;
  onSave: (updates: Partial<Bet>) => void;
}

const BET_TYPES = [
  'Single', 'Anytime TD', 'SGP', 'Round Robin', 
  'SGPX', 'Spread', 'Moneyline', 'Total Points', 'Parlay'
];

export function EditBetModal({ isOpen, bet, onClose, onSave }: EditBetModalProps) {
  const [formData, setFormData] = useState<Partial<Bet>>({
    id: '',
    week: 0,
    gameDate: '',
    stake: 0,
    odds: 0,
    status: 'pending',
    type: 'Parlay', // New field
    legs: []
  });

  useEffect(() => {
    if (bet) {
      const displayDate = resolveFirestoreDate(bet.gameDate || bet.createdAt).toISOString().split('T')[0];
      setFormData({
        ...bet,
        week: bet.week ?? 0,
        gameDate: displayDate,
        stake: bet.stake || 0,
        type: bet.type || (bet.legs && bet.legs.length > 1 ? 'Parlay' : 'Single'),
        legs: bet.legs || [],
      });
    }
  }, [bet]);

  // Handle individual leg updates
  const updateLeg = (index: number, updates: Partial<BetLeg>) => {
    const newLegs = [...(formData.legs || [])];
    newLegs[index] = { ...newLegs[index], ...updates };
    setFormData({ ...formData, legs: newLegs });
  };

  // Handle leg deletion
  const removeLeg = (index: number) => {
    const newLegs = (formData.legs || []).filter((_, i) => i !== index);
    setFormData({ ...formData, legs: newLegs });
  };

  const handleSubmit = () => {
    const stakeNum = Number(formData.stake || 0);
    const oddsNum = Number(formData.odds || 0);
    let calculatedProfit = 0;

    if (formData.status === 'won') {
      const decimalOdds = oddsNum > 0 ? (oddsNum / 100) : (100 / Math.abs(oddsNum));
      calculatedProfit = stakeNum * decimalOdds;
    } else if (formData.status === 'lost') {
      calculatedProfit = -stakeNum;
    }

    onSave({ 
      ...formData, 
      profit: calculatedProfit, 
      payout: stakeNum + calculatedProfit,
      stake: stakeNum, 
      odds: oddsNum,
      week: Number(formData.week || 0),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Bet Details</h2>
            <p className="text-xs text-slate-400 mt-1">ID: {formData.id?.slice(0,8)}...</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* Main Bet Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">Bet Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">Total Odds</label>
              <input type="number" value={formData.odds || ''} onChange={(e) => setFormData({...formData, odds: parseFloat(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">Stake ($)</label>
              <input type="number" value={formData.stake || ''} onChange={(e) => setFormData({...formData, stake: parseFloat(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">Game Date</label>
              <input type="date" value={formData.gameDate || ''} onChange={(e) => setFormData({...formData, gameDate: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">NFL Week</label>
              <input type="number" value={formData.week || ''} onChange={(e) => setFormData({...formData, week: parseInt(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">Overall Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none">
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {/* Individual Legs Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-2">
              <Layers className="h-3 w-3" />
              Individual Legs ({(formData.legs?.length || 0)})
            </h3>
            
            <div className="space-y-3">
              {formData.legs?.map((leg, index) => (
                <div key={leg.id || index} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Player/Prop Info (Read-only labels, editable line) */}
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-bold text-white">{leg.player}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">{leg.prop} • {leg.selection}</p>
                    </div>

                    {/* Editable Line */}
                    <div className="w-24">
                      <label className="block text-[9px] text-slate-500 uppercase mb-1">Line</label>
                      <input 
                        type="number" step="0.5" value={leg.line} 
                        onChange={(e) => updateLeg(index, { line: parseFloat(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>

                    {/* Leg Status */}
                    <div className="w-32">
                      <label className="block text-[9px] text-slate-500 uppercase mb-1">Result</label>
                      <select 
                        value={leg.status} 
                        onChange={(e) => updateLeg(index, { status: e.target.value as any })}
                        className={`w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-bold ${
                          leg.status === 'won' ? 'text-emerald-400' : leg.status === 'lost' ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="void">Void</option>
                      </select>
                    </div>

                    {/* Delete Leg */}
                    <button 
                      onClick={() => removeLeg(index)}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors mt-4"
                      title="Remove Leg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex gap-3 bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-900/20">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
