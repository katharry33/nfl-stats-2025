'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddPropModalProps {
  isOpen: boolean;
  onClose: () => void;
  league: 'nfl' | 'nba';
  season: number;
}

export function AddPropModal({ isOpen, onClose, league, season }: AddPropModalProps) {
  const [player, setPlayer] = useState('');
  const [team, setTeam] = useState('');
  const [opponent, setOpponent] = useState('');
  const [prop, setProp] = useState('');
  const [line, setLine] = useState('');
  const [overUnder, setOverUnder] = useState<'Over' | 'Under' | ''>('');
  const [gameDate, setGameDate] = useState('');
  const [week, setWeek] = useState<number | ''>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setPlayer('');
    setTeam('');
    setOpponent('');
    setProp('');
    setLine('');
    setOverUnder('');
    setGameDate('');
    setWeek('');
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!player || !team || !opponent || !prop || !line) {
      setError('Missing required fields.');
      return;
    }

    if (league === 'nfl' && !week) {
      setError('NFL props require a week.');
      return;
    }

    if (league === 'nba' && !gameDate) {
      setError('NBA props require a game date.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/props/add', {
        method: 'POST',
        body: JSON.stringify({
          player,
          team,
          opponent,
          matchup: `${team}@${opponent}`,
          prop,
          line: Number(line),
          overUnder: overUnder || null,
          league,
          season,
          gameDate: league === 'nba' ? gameDate : null,
          week: league === 'nfl' ? Number(week) : null
        })
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to add prop.');
        setLoading(false);
        return;
      }

      reset();
      onClose();

      // Trigger revalidation (Next.js cache refresh)
      try {
        // Optional: if you use SWR or React Query, you can trigger a refetch here
        // mutate('/api/props');
      } catch {}

    } catch (err) {
      console.error(err);
      setError('Failed to add prop.');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">
            Add Prop
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-rose-400 text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <input
            placeholder="Player"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          />

          <input
            placeholder="Team (SEA)"
            value={team}
            onChange={(e) => setTeam(e.target.value.toUpperCase())}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          />

          <input
            placeholder="Opponent (TEN)"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value.toUpperCase())}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          />

          <input
            placeholder="Prop (Receptions)"
            value={prop}
            onChange={(e) => setProp(e.target.value)}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          />

          <input
            placeholder="Line (2.5)"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          />

          <select
            value={overUnder}
            onChange={(e) => setOverUnder(e.target.value as any)}
            className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
          >
            <option value="">Over/Under</option>
            <option value="Over">Over</option>
            <option value="Under">Under</option>
          </select>

          {/* NFL Week */}
          {league === 'nfl' && (
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
            >
              <option value="">Week</option>
              {Array.from({ length: 18 }).map((_, i) => (
                <option key={i} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </select>
          )}

          {/* NBA Date */}
          {league === 'nba' && (
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
            />
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full px-4 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-widest"
        >
          {loading ? 'Adding…' : 'Add Prop'}
        </button>
      </div>
    </div>
  );
}
