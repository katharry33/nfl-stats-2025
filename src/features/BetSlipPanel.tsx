// src/features/bet-builder/BetSlipPanel.tsx
'use client';

import { useState } from 'react';
import type { BetSlipItem } from '@/hooks/useBetSlip';
import { impliedProb } from '@/lib/enrichment/scoring';

interface BetSlipPanelProps {
  items: BetSlipItem[];
  totalStake: number;
  savingIds: Set<string>;
  onUpdateAmount: (id: string, amount: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSaveToParlay: () => void;
}

export function BetSlipPanel({
  items, totalStake, savingIds,
  onUpdateAmount, onRemove, onClear, onSaveToParlay,
}: BetSlipPanelProps) {
  const [defaultStake, setDefaultStake] = useState(10);

  const applyDefaultStake = () => {
    items.forEach(i => onUpdateAmount(i.prop.id!, defaultStake));
  };

  // Estimated parlay payout (multiply decimal odds)
  const parlayMultiplier = items.reduce((acc, i) => {
    const odds = i.prop.bestOdds;
    if (!odds) return acc;
    const dec = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    return acc * dec;
  }, 1);

  const parlayPayout = totalStake > 0 && items.length > 1
    ? totalStake * parlayMultiplier
    : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-2">
        <span className="text-3xl">🏈</span>
        <p>Add props to build your bet slip</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick stake setter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Default stake</span>
        <input
          type="number"
          min={1}
          value={defaultStake}
          onChange={e => setDefaultStake(Number(e.target.value))}
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
        />
        <button
          onClick={applyDefaultStake}
          className="text-xs text-green-400 hover:text-green-300 underline"
        >
          Apply all
        </button>
      </div>

      {/* Props list */}
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map(item => (
          <BetSlipRow
            key={item.prop.id}
            item={item}
            isSaving={savingIds.has(item.prop.id!)}
            onUpdateAmount={onUpdateAmount}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-800 pt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Total Props</span>
          <span>{items.length}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Total Stake</span>
          <span className="text-white font-mono">${totalStake.toFixed(2)}</span>
        </div>
        {parlayPayout && (
          <div className="flex justify-between text-green-400 font-semibold">
            <span>Parlay Payout (est.)</span>
            <span className="font-mono">${parlayPayout.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onSaveToParlay}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          Save to Parlay Studio →
        </button>
        <button
          onClick={onClear}
          className="w-full text-gray-500 hover:text-red-400 text-xs py-1 transition-colors"
        >
          Clear bet slip
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BetSlipRow({
  item, isSaving, onUpdateAmount, onRemove,
}: {
  item: BetSlipItem;
  isSaving: boolean;
  onUpdateAmount: (id: string, amount: number) => void;
  onRemove: (id: string) => void;
}) {
  const { prop, betAmount, overUnder } = item;

  const winProb  = prop.avgWinProb ?? prop.projWinPct ?? null;
  const implProb = prop.bestOdds ? impliedProb(prop.bestOdds) : null;
  const edge     = winProb != null && implProb != null ? winProb - implProb : null;

  const fmtOdds = (v?: number | null) =>
    v == null ? '' : v > 0 ? `+${v}` : `${v}`;

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {prop.valueIcon} {prop.player}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {prop.prop} {overUnder} {prop.line} · {prop.team}
          </div>
        </div>
        <button
          onClick={() => onRemove(prop.id!)}
          className="text-gray-600 hover:text-red-400 text-lg leading-none flex-shrink-0"
          title="Remove"
        >
          ×
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-xs text-gray-500">
        {winProb != null && (
          <span>Win: <span className="text-white">{(winProb * 100).toFixed(0)}%</span></span>
        )}
        {edge != null && (
          <span className={edge > 0 ? 'text-green-400' : 'text-red-400'}>
            Edge: {(edge * 100).toFixed(1)}%
          </span>
        )}
        {prop.bestOdds != null && (
          <span>{fmtOdds(prop.bestOdds)} <span className="text-gray-600">({prop.bestBook})</span></span>
        )}
      </div>

      {/* Stake input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Stake</span>
        <div className="flex items-center bg-gray-900 rounded border border-gray-700 overflow-hidden">
          <span className="px-2 text-gray-500 text-sm">$</span>
          <input
            type="number"
            min={1}
            value={betAmount}
            onChange={e => onUpdateAmount(prop.id!, Number(e.target.value))}
            className="w-16 bg-transparent text-sm text-white focus:outline-none py-1 pr-2"
          />
        </div>
        {isSaving && <span className="text-xs text-gray-600 animate-pulse">saving...</span>}

        {/* Estimated win */}
        {prop.bestOdds && (
          <span className="ml-auto text-xs text-green-400 font-mono">
            {prop.bestOdds > 0
              ? `+$${(betAmount * prop.bestOdds / 100).toFixed(2)}`
              : `+$${(betAmount * 100 / Math.abs(prop.bestOdds)).toFixed(2)}`
            }
          </span>
        )}
      </div>
    </div>
  );
}