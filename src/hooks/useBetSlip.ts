// src/hooks/useBetSlip.ts
//
// SHIM — do not add logic here.
// Re-exports everything from the real context so existing imports keep working
// without needing a find-and-replace across the codebase.
//
// The real implementation lives in: src/context/betslip-context.tsx

export {
    useBetSlip,
    BetSlipProvider,
    type BetSlipContextType,
  } from '@/context/betslip-context';