'use client';
// src/components/bets/SweetSpotBadge.tsx
//
// Compact target-ring badge with a football center.
// Used inline on BettingLog rows and BetBuilder cards.
// Tier:  bullseye (gold glow)  hot (orange)  warm (yellow)  cold (hidden)

import React, { useState } from 'react';
import type { SweetSpotResult } from '@/lib/utils/sweetSpotScore';

// ─── SVG Target ───────────────────────────────────────────────────────────────

function TargetSvg({ tier, score }: { tier: SweetSpotResult['tier']; score: number }) {
  const colors = {
    bullseye: { ring1: '#FFD700', ring2: '#e6c200cc', ring3: '#e6c20066', glow: '#FFD70066' },
    hot:      { ring1: '#f97316', ring2: '#f9731699', ring3: '#f9731633', glow: '#f9731644' },
    warm:     { ring1: '#facc15', ring2: '#facc1566', ring3: '#facc1522', glow: '#facc1533' },
    cold:     { ring1: '#52525b', ring2: '#3f3f4666', ring3: '#3f3f4622', glow: 'transparent' },
  };
  const c = colors[tier];

  return (
    <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
      {/* Glow */}
      {tier !== 'cold' && (
        <circle cx="20" cy="20" r="19" fill={c.glow} />
      )}
      {/* Rings */}
      <circle cx="20" cy="20" r="17" stroke={c.ring3} strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="12" stroke={c.ring2} strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="7"  stroke={c.ring1} strokeWidth="2"   fill="none" />
      {/* Center dot / football */}
      {tier === 'bullseye' ? (
        <text x="20" y="23" textAnchor="middle" fontSize="8">🏈</text>
      ) : (
        <circle cx="20" cy="20" r="3" fill={c.ring1} />
      )}
    </svg>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ result }: { result: SweetSpotResult }) {
  const tierLabels = {
    bullseye: 'SWEET SPOT 🎯',
    hot:      'HOT PICK 🔥',
    warm:     'DECENT SIGNAL',
    cold:     'WEAK SIGNAL',
  };
  const tierColors = {
    bullseye: 'text-[#FFD700]',
    hot:      'text-orange-400',
    warm:     'text-yellow-400',
    cold:     'text-zinc-500',
  };

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 pointer-events-none">
      <div className="bg-[#0a0c0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
          <span className={`text-[9px] font-black uppercase tracking-widest ${tierColors[result.tier]}`}>
            {tierLabels[result.tier]}
          </span>
          <span className={`text-xs font-black font-mono ${tierColors[result.tier]}`}>
            {result.score}/100
          </span>
        </div>

        {/* Signals grid */}
        <div className="p-2 grid grid-cols-2 gap-1">
          {result.signals.map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              s.hit ? 'bg-[#FFD700]/[0.08] border border-[#FFD700]/20' : 'bg-white/[0.02]'
            }`}>
              <span className={`text-[8px] ${s.hit ? 'text-[#FFD700]' : 'text-zinc-600'}`}>
                {s.hit ? '✓' : '·'}
              </span>
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase text-zinc-600 leading-none">{s.label}</p>
                <p className={`text-[9px] font-mono font-bold truncate leading-tight ${s.hit ? 'text-white' : 'text-zinc-600'}`}>
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reasons */}
        {result.reasons.length > 0 && (
          <div className="px-3 pb-2.5 space-y-1">
            {result.reasons.slice(0, 3).map((r, i) => (
              <p key={i} className="text-[8px] text-zinc-500 leading-tight">↳ {r}</p>
            ))}
          </div>
        )}

        {/* Arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0c0f] border-r border-b border-white/10 rotate-45" />
      </div>
    </div>
  );
}

// ─── Main Badge ───────────────────────────────────────────────────────────────

interface SweetSpotBadgeProps {
  result:  SweetSpotResult;
  size?:   'sm' | 'md' | 'lg';
  /** If true, always show even for cold tier */
  showCold?: boolean;
}

export function SweetSpotBadge({ result, size = 'sm', showCold = false }: SweetSpotBadgeProps) {
  const [hover, setHover] = useState(false);

  if (result.tier === 'cold' && !showCold) return null;

  const sizes = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${sizes[size]} cursor-pointer`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <TargetSvg tier={result.tier} score={result.score} />
      {hover && <Tooltip result={result} />}
    </div>
  );
}

// ─── Inline Score Bar (for full sweet spot panel) ────────────────────────────

export function SweetSpotScoreBar({ score, tier }: { score: number; tier: SweetSpotResult['tier'] }) {
  const colors = {
    bullseye: '#FFD700',
    hot:      '#f97316',
    warm:     '#facc15',
    cold:     '#52525b',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: colors[tier] }}
        />
      </div>
      <span className="text-[9px] font-black font-mono w-8 text-right" style={{ color: colors[tier] }}>
        {score}
      </span>
    </div>
  );
}