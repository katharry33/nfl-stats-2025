import { z } from 'zod';

export const NFLPropSchema = z.object({
  id: z.string(),
  player: z.string(),
  team: z.string(),
  prop: z.string(),
  line: z.number(),
  overUnder: z.enum(['Over', 'Under']),
  
  // Normalized Stats
  scoreDiff: z.number().default(0),
  seasonHitPct: z.number().default(0),
  confidenceScore: z.number().default(0),
  expectedValue: z.number().default(0),
  
  // Results
  gameStat: z.number().optional(),
  actualResult: z.enum(['won', 'lost', 'push', 'pending']).default('pending'),
  
  // Metadata
  week: z.number(),
  season: z.number(),
  updatedAt: z.any().optional(), // Firestore Timestamp
});

export type NFLProp = z.infer<typeof NFLPropSchema>;