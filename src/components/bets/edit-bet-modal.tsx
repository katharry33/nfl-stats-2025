import { useState, useEffect } from 'react';
import { X, DollarSign, Hash, TrendingUp, Trophy } from 'lucide-react';
import { Bet } from '@/lib/types';

interface EditBetModalProps {
  isOpen: boolean;
  bet: Bet | null;
  onClose: () => void;
  onSave: (updates: Partial<Bet>) => void;
}

export function EditBetModal({ isOpen, bet, onClose, onSave }: EditBetModalProps) {
  const [formData, setFormData] = useState<Partial<Bet>>({
    id: '',
    week: '',
    stake: 0,
    odds: 0,
    status: 'pending',
    profit: 0,
    notes: '',
    legs: []
  });

  useEffect(() => {
    if (bet) {
      setFormData({
        ...bet,
        week: bet.week || '',
        stake: bet.stake || bet.betAmount || 0,
        legs: bet.legs || [],
      });
    } else {
      // Reset form when there is no bet
      setFormData({
        id: '',
        week: '',
        stake: 0,
        odds: 0,
        status: 'pending',
        profit: 0,
        notes: '',
        legs: []
      });
    }
  }, [bet]);

  const handleSubmit = () => {
    let calculatedProfit = 0;
    const stakeNum = Number(formData.stake || 0);
    const oddsNum = Number(formData.odds || 0);

    if (formData.status === 'won') {
      const decimalOdds = oddsNum > 0 
        ? (oddsNum / 100) 
        : (100 / Math.abs(oddsNum));
      calculatedProfit = stakeNum * decimalOdds;
    } else if (formData.status === 'lost') {
      calculatedProfit = -stakeNum;
    }

    onSave({ ...formData, profit: calculatedProfit, stake: stakeNum, odds: oddsNum });
  };

  const updateLeg = (index: number, field: string, value: any) => {
    const newLegs = [...(formData.legs || [])];
    newLegs[index] = { ...newLegs[index], [field]: value };
    setFormData({ ...formData, legs: newLegs });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Bet</h2>
            <p className="text-xs text-slate-400 mt-1">
              {(formData.legs?.length ?? 0)} leg{(formData.legs?.length ?? 0) !== 1 ? 's' : ''} • Week {formData.week}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bet Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Week */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                <Hash className="h-3 w-3 inline mr-1" />
                Week
              </label>
              <input
                type="text"
                value={formData.week || ''}
                onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Stake */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                <DollarSign className="h-3 w-3 inline mr-1" />
                Stake
              </label>
              <input
                type="number"
                value={formData.stake || ''}
                onChange={(e) => setFormData({ ...formData, stake: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                step="0.01"
                min="0"
              />
            </div>

            {/* Odds */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Odds
              </label>
              <input
                type="number"
                value={formData.odds || ''}
                onChange={(e) => setFormData({ ...formData, odds: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                <Trophy className="h-3 w-3 inline mr-1" />
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {/* Legs Section */}
          {(formData.legs?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Bet Legs</h3>
              {(formData.legs || []).map((leg, index) => (
                <div key={index} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500">LEG {index + 1}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Player</label>
                      <input
                        type="text"
                        value={leg.player}
                        onChange={(e) => updateLeg(index, 'player', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Prop</label>
                      <input
                        type="text"
                        value={leg.prop}
                        onChange={(e) => updateLeg(index, 'prop', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Line</label>
                      <input
                        type="number"
                        value={leg.line}
                        onChange={(e) => updateLeg(index, 'line', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                        step="0.5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Matchup</label>
                      <input
                        type="text"
                        value={leg.matchup || ''}
                        onChange={(e) => updateLeg(index, 'matchup', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                        placeholder="e.g., KC @ BUF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Result</label>
                    <select
                      value={leg.result || ''}
                      onChange={(e) => updateLeg(index, 'result', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                    >
                      <option value="">Not Set</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="push">Push</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              rows={3}
              placeholder="Add any notes about this bet..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}