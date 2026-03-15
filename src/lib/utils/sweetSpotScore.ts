// src/lib/utils/sweetSpotScore.ts
//
// Client-side scoring utility.
// Given a prop's enrichment data and the user's scoring criteria from /api/sweet-spots,
// returns a score 0–100 indicating how well the prop fits the user's historical sweet spots.

export interface ScoringCriteria {
    overallHitRate: number;
    totalLegs:      number;
    wonLegs:        number;
    scoreDiff:      { min: number; max: number; hitRate: number; label: string }[];
    confidence:     { min: number; max: number; hitRate: number; label: string }[];
    opponentRank:   { min: number; max: number; hitRate: number; label: string }[];
    edge:           { min: number; max: number; hitRate: number; label: string }[];
    kelly:          { min: number; max: number; hitRate: number; label: string }[];
    propTypes:      string[];
    preferredOU:    string | null;
    bestLegCount:   number | null;
  }
  
  export interface PropSnapshot {
    prop?:           string;
    overUnder?:      string;
    scoreDiff?:      number | null;
    confidenceScore?: number | null;
    opponentRank?:   number | null;
    bestEdgePct?:    number | null;
    kellyPct?:       number | null;
    legCount?:       number;
  }
  
  export interface SweetSpotResult {
    score:   number;    // 0–100
    tier:    'bullseye' | 'hot' | 'warm' | 'cold';
    reasons: string[];  // human-readable explanation of what matched
    signals: {
      label:  string;
      hit:    boolean;
      value:  string;
    }[];
  }
  
  function normPct(v: number | null | undefined): number | null {
    if (v == null || isNaN(v)) return null;
    return v <= 1.5 ? v * 100 : v;
  }
  
  function inRange(v: number, min: number, max: number) {
    return v >= min && v < max;
  }
  
  export function scoreProp(prop: PropSnapshot, criteria: ScoringCriteria): SweetSpotResult {
    const reasons: string[]  = [];
    const signals: SweetSpotResult['signals'] = [];
    let   points  = 0;
    let   maxPts  = 0;
  
    // ── Score diff ─────────────────────────────────────────────────────────────
    const sd = prop.scoreDiff != null ? Number(prop.scoreDiff) : null;
    {
      maxPts += 25;
      const match = sd != null
        ? criteria.scoreDiff.find(c => inRange(sd, c.min, c.max))
        : null;
      const hit = !!match;
      signals.push({
        label: 'Score Diff',
        hit,
        value: sd != null ? (sd > 0 ? `+${sd.toFixed(1)}` : `${sd.toFixed(1)}`) : '—',
      });
      if (hit) {
        const boost = Math.round(((match!.hitRate - criteria.overallHitRate) / criteria.overallHitRate) * 25);
        points += Math.min(25, 15 + boost);
        reasons.push(`Score diff ${match!.label} — ${match!.hitRate.toFixed(0)}% hit rate in your history`);
      }
    }
  
    // ── Confidence score ───────────────────────────────────────────────────────
    const conf = normPct(prop.confidenceScore);
    {
      maxPts += 20;
      const match = conf != null
        ? criteria.confidence.find(c => inRange(conf, c.min, c.max))
        : null;
      const hit = !!match;
      signals.push({
        label: 'Confidence',
        hit,
        value: conf != null ? `${conf.toFixed(0)}%` : '—',
      });
      if (hit) {
        points += 20;
        reasons.push(`Confidence ${match!.label} — your sweet spot range`);
      }
    }
  
    // ── Opponent rank ──────────────────────────────────────────────────────────
    const rank = prop.opponentRank != null ? Number(prop.opponentRank) : null;
    {
      maxPts += 20;
      const match = rank != null
        ? criteria.opponentRank.find(c => inRange(rank, c.min, c.max))
        : null;
      const hit = !!match;
      signals.push({
        label: 'Opp Rank',
        hit,
        value: rank != null ? `#${rank}` : '—',
      });
      if (hit) {
        points += 20;
        reasons.push(`Facing rank #${rank} defense — ${match!.label} tier hits at ${match!.hitRate.toFixed(0)}%`);
      }
    }
  
    // ── Edge ───────────────────────────────────────────────────────────────────
    const edge = normPct(prop.bestEdgePct);
    {
      maxPts += 15;
      const match = edge != null
        ? criteria.edge.find(c => inRange(edge, c.min, c.max))
        : null;
      const hit = !!match;
      signals.push({
        label: 'Edge %',
        hit,
        value: edge != null ? (edge > 0 ? `+${edge.toFixed(1)}%` : `${edge.toFixed(1)}%`) : '—',
      });
      if (hit) {
        points += 15;
        reasons.push(`Edge ${match!.label} — positive expected value in your sweet zone`);
      }
    }
  
    // ── Prop type ──────────────────────────────────────────────────────────────
    {
      maxPts += 10;
      const propNorm = (prop.prop ?? '').toLowerCase().trim();
      const hit = criteria.propTypes.some(p => p.toLowerCase() === propNorm);
      signals.push({
        label: 'Prop Type',
        hit,
        value: prop.prop ?? '—',
      });
      if (hit) {
        points += 10;
        reasons.push(`${prop.prop} is a top-performing prop type for you`);
      }
    }
  
    // ── Over/Under direction ───────────────────────────────────────────────────
    {
      maxPts += 5;
      const ou  = (prop.overUnder ?? '').toLowerCase();
      const hit = !!criteria.preferredOU && ou === criteria.preferredOU.toLowerCase();
      signals.push({
        label: 'Direction',
        hit,
        value: prop.overUnder ? (prop.overUnder.charAt(0).toUpperCase() + prop.overUnder.slice(1).toLowerCase()) : '—',
      });
      if (hit) {
        points += 5;
        reasons.push(`${criteria.preferredOU} bets outperform in your history`);
      }
    }
  
    // ── Kelly % ────────────────────────────────────────────────────────────────
    const kelly = normPct(prop.kellyPct);
    {
      maxPts += 5;
      const match = kelly != null
        ? criteria.kelly.find(c => inRange(kelly, c.min, c.max))
        : null;
      const hit = !!match;
      if (hit) {
        points += 5;
        reasons.push(`Kelly ${match!.label} — model recommends meaningful stake`);
      }
      signals.push({ label: 'Kelly %', hit, value: kelly != null ? `${kelly.toFixed(1)}%` : '—' });
    }
  
    const score = maxPts > 0 ? Math.round((points / maxPts) * 100) : 0;
    const tier: SweetSpotResult['tier'] =
      score >= 75 ? 'bullseye' :
      score >= 55 ? 'hot' :
      score >= 35 ? 'warm' : 'cold';
  
    return { score, tier, reasons, signals };
  }
  
  // Hook for loading criteria once and caching
  let _cachedCriteria: ScoringCriteria | null = null;
  
  export async function fetchScoringCriteria(): Promise<ScoringCriteria | null> {
    if (_cachedCriteria) return _cachedCriteria;
    try {
      const res = await fetch('/api/sweet-spots');
      if (!res.ok) return null;
      const data = await res.json();
      _cachedCriteria = data.scoringCriteria;
      return _cachedCriteria;
    } catch {
      return null;
    }
  }
  
  export function clearCriteriaCache() {
    _cachedCriteria = null;
  }