export interface RangeCriterion {
  min: number;
  max: number;
  weight: number;
  inverted?: boolean;
}

export interface PropCriterion {
  type: string;
  weight: number;
}

export interface OverUnderCriterion {
  direction: 'any' | 'over' | 'under';
  weight: number;
}

export interface ScoringCriteria {
  prop: PropCriterion;
  overUnder: OverUnderCriterion;
  scoreDiff: RangeCriterion;
  confidenceScore: RangeCriterion;
  opponentRank: RangeCriterion;
  bestEdgePct: RangeCriterion;
  kellyPct: RangeCriterion;
}

export interface PropData {
  prop?: string | null;
  overUnder?: string | null;
  scoreDiff?: number | null;
  confidenceScore?: number | null;
  opponentRank?: number | null;
  bestEdgePct?: number | null;
  kellyPct?: number | null;
}

export interface SweetSpotResult {
  score: number;
  tier: 'bullseye' | 'hot' | 'strong' | 'cold';
  contributingFactors: { factor: string; score: number }[];
}

function normalize(value: number, min: number, max: number, inverted = false): number {
  if (value < min) value = min;
  if (value > max) value = max;
  const normalized = (value - min) / (max - min);
  return inverted ? 1 - normalized : normalized;
}

export function scoreProp(propData: PropData, criteria: ScoringCriteria): SweetSpotResult {
  let totalScore = 0;
  const contributingFactors: { factor: string; score: number }[] = [];

  const factors: (keyof ScoringCriteria)[] = [
    'scoreDiff', 'confidenceScore', 'opponentRank', 'bestEdgePct', 'kellyPct'
  ];

  factors.forEach(factor => {
    const criterion = criteria[factor] as RangeCriterion;
    const value = propData[factor] as number | null | undefined;

    if (value != null && criterion.weight > 0) {
      const normalizedValue = normalize(value, criterion.min, criterion.max, criterion.inverted);
      const factorScore = normalizedValue * criterion.weight;
      if (factorScore > 0) {
        totalScore += factorScore;
        contributingFactors.push({ factor, score: factorScore });
      }
    }
  });

  // Handle discrete prop type
  if (criteria.prop.weight > 0 && criteria.prop.type !== 'any' && propData.prop === criteria.prop.type) {
    totalScore += criteria.prop.weight;
    contributingFactors.push({ factor: 'prop type', score: criteria.prop.weight });
  }

  // Handle discrete over/under
  if (criteria.overUnder.weight > 0 && criteria.overUnder.direction !== 'any' && propData.overUnder?.toLowerCase() === criteria.overUnder.direction) {
    totalScore += criteria.overUnder.weight;
    contributingFactors.push({ factor: 'over/under', score: criteria.overUnder.weight });
  }

  let tier: SweetSpotResult['tier'] = 'cold';
  if (totalScore >= 4.5) tier = 'bullseye';
  else if (totalScore >= 3.0) tier = 'hot';
  else if (totalScore >= 1.5) tier = 'strong';

  return { score: totalScore, tier, contributingFactors };
}

export async function fetchScoringCriteria() {
  // your logic here
  // return ...
}
