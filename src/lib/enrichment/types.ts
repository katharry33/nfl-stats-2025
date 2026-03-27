// src/lib/enrichment/types.ts

import { PropDoc } from '@/lib/types';

// A single prop passed into enrichment
export type EnrichmentTarget = PropDoc;

// A batch enrichment job (e.g., enrich all props for a date/week)
export interface EnrichmentJob {
  league: 'nba' | 'nfl';
  season: number;
  week?: number | null;
  date?: string | null;
  props: PropDoc[];
}
