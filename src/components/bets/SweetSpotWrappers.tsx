'use client';
// src/components/bets/SweetSpotWrappers.tsx
// SweetSpotRow (<tr> wrapper) and SweetSpotCard (<div> wrapper).

import React from 'react';
import { scoreProp, type ScoringCriteria, type PropSnapshot } from '@/lib/utils/sweetSpotScore';
import { SweetSpotBadge } from '@/components/bets/SweetSpotBadge';

// ─── SweetSpotRow ─────────────────────────────────────────────────────────────

interface SweetSpotRowProps {
  prop:       PropSnapshot;
  criteria?:  ScoringCriteria | null;
  children:   React.ReactNode;
  className?: string;
  showBadge?: boolean;
}

/**
 * Drop-in <tr> wrapper. Adds a left-edge gold/orange glow and inline badge.
 *
 * Usage:
 *   <SweetSpotRow prop={snapshot} criteria={criteria} className="border-t border-white/[0.04]">
 *     <td>…</td>
 *   </SweetSpotRow>
 */
export function SweetSpotRow({
  prop, criteria, children, className = '', showBadge = true,
}: SweetSpotRowProps) {
  const result = criteria ? scoreProp(prop, criteria) : null;

  const glow =
    result?.tier === 'bullseye' ? 'shadow-[inset_2px_0_0_0_#FFD700]' :
    result?.tier === 'hot'      ? 'shadow-[inset_2px_0_0_0_#f97316]' :
    '';

  return (
    <tr className={`${className} ${glow} transition-all`}>
      {children}
      {showBadge && (
        <td className="px-2 py-2 w-8" onClick={(e) => e.stopPropagation()}>
          {result && result.tier !== 'cold' && (
            <SweetSpotBadge result={result} size="sm" />
          )}
        </td>
      )}
    </tr>
  );
}

// ─── SweetSpotCard ────────────────────────────────────────────────────────────

interface SweetSpotCardProps {
  prop:       PropSnapshot;
  criteria?:  ScoringCriteria | null;
  children:   React.ReactNode;
  className?: string;
}

/**
 * Drop-in <div> wrapper for cards (BetBuilder). Adds glowing border + badge.
 *
 * Usage:
 *   <SweetSpotCard prop={snapshot} criteria={criteria} className="bg-[#0f1115] border rounded-2xl p-4">
 *     …card content…
 *   </SweetSpotCard>
 */
export function SweetSpotCard({ prop, criteria, children, className = '' }: SweetSpotCardProps) {
  const result = criteria ? scoreProp(prop, criteria) : null;

  const glow =
    result?.tier === 'bullseye'
      ? 'border-[#FFD700]/40 shadow-[0_0_20px_rgba(255,215,0,0.08)]'
    : result?.tier === 'hot'
      ? 'border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.06)]'
    : result?.tier === 'warm'
      ? 'border-yellow-500/20'
    : '';

  return (
    <div className={`relative ${className} ${glow} transition-all duration-300`}>
      {result && result.tier !== 'cold' && (
        <div className="absolute top-2 right-2 z-10">
          <SweetSpotBadge result={result} size="md" />
        </div>
      )}
      {result?.tier === 'bullseye' && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
      )}
      {children}
    </div>
  );
}