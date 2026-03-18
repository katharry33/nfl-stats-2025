'use client';

import React from 'react';
import type { ScoringCriteria, PropCriterion, OverUnderCriterion, RangeCriterion } from '@/lib/utils/sweetSpotScore';
import { Sliders, RefreshCw, Zap, Type, Hash, Shield, Percent, Target } from 'lucide-react';

interface SweetSpotFiltersProps {
  criteria: ScoringCriteria;
  onCriteriaChange: (c: ScoringCriteria) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-cyan-400" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RangeSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-bold text-slate-500 w-12">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
      />
      <span className="text-xs font-mono text-slate-300 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export function SweetSpotFilters({ criteria, onCriteriaChange, onRefresh, isLoading }: SweetSpotFiltersProps) {

  const handlePropChange = (key: keyof ScoringCriteria, field: string, value: any) => {
    onCriteriaChange({ ...criteria, [key]: { ...criteria[key] as any, [field]: value } });
  };

  const handleRangeChange = (key: keyof ScoringCriteria, field: 'min' | 'max' | 'weight', value: number) => {
    handlePropChange(key, field, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Scoring Model</h2>
        </div>
        <button onClick={onRefresh} disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 text-xs font-black uppercase transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Section title="Prop Type" icon={Type}>
        <select
          value={criteria.prop.type}
          onChange={e => handlePropChange('prop', 'type', e.target.value)}
          className="w-full py-2 px-3 bg-card border border-border text-slate-300 text-sm font-mono rounded-xl outline-none focus:ring-1 focus:ring-cyan-400/30"
        >
          <option value="any">Any Prop</option>
          <option value="Passing TDs">Passing TDs</option>
          <option value="Passing Yards">Passing Yards</option>
          <option value="Receiving Yards">Receiving Yards</option>
          <option value="Rushing Yards">Rushing Yards</option>
          <option value="Tackles">Tackles</option>
          {/* Add more as needed */}
        </select>
      </Section>

      <Section title="Over/Under" icon={Hash}>
        <div className="flex rounded-xl overflow-hidden border border-border w-full">
          {(['any', 'over', 'under'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => handlePropChange('overUnder', 'direction', dir)}
              className={`flex-1 px-3 py-2 text-[9px] font-black uppercase transition-colors ${
                criteria.overUnder.direction === dir
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'bg-card text-slate-500 hover:text-slate-300'
              }`}>
              {dir}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Confidence Score" icon={Zap}>
        <RangeSlider label="Weight" min={0} max={5} step={0.1} value={criteria.confidenceScore.weight} onChange={v => handleRangeChange('confidenceScore', 'weight', v)} />
      </Section>
      
      <Section title="Score Differential" icon={Target}>
        <RangeSlider label="Weight" min={0} max={5} step={0.1} value={criteria.scoreDiff.weight} onChange={v => handleRangeChange('scoreDiff', 'weight', v)} />
      </Section>

      <Section title="Opponent Rank" icon={Shield}>
         <RangeSlider label="Weight" min={0} max={5} step={0.1} value={criteria.opponentRank.weight} onChange={v => handleRangeChange('opponentRank', 'weight', v)} />
      </Section>

      <Section title="Edge & Kelly" icon={Percent}>
         <RangeSlider label="Edge Wt" min={0} max={5} step={0.1} value={criteria.bestEdgePct.weight} onChange={v => handleRangeChange('bestEdgePct', 'weight', v)} />
         <RangeSlider label="Kelly Wt" min={0} max={5} step={0.1} value={criteria.kellyPct.weight} onChange={v => handleRangeChange('kellyPct', 'weight', v)} />
      </Section>

    </div>
  );
}
