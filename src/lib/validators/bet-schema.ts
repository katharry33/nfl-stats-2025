import { z } from 'zod';

export const BetLegSchema = z.object({
  propId: z.string(),
  player: z.string(),
  prop: z.string(),
  selection: z.string(),
  line: z.number(),
  odds: z.number(),
  result: z.enum(['Won', 'Lost', 'Push', 'Pending']).default('Pending'),
});

export const BetSchema = z.object({
  legs: z.array(BetLegSchema).min(1, 'At least one leg is required'),
  // Changed wager to stake to match your previous bankroll-math logic
  stake: z.number().positive('Stake must be positive'), 
  totalOdds: z.number(),
  status: z.enum(['Won', 'Lost', 'Push', 'Pending']).default('Pending'),
  createdAt: z.any().optional(), // For Firestore ServerTimestamp
});

export type BetInput = z.infer<typeof BetSchema>;

// Helper to use in Server Actions
export const validateBet = (data: any) => {
  return BetSchema.safeParse(data);
};