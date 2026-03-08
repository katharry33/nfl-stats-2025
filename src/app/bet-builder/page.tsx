// src/app/bet-builder/page.tsx
import { BetBuilderClient } from '@/features/bet-builder-client';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';

const SEASON = 2025;

export default function BetBuilderPage() {
  const week = getCurrentNFLWeek(SEASON);
  return (
    <div className="min-h-screen bg-[#060606]">
      <BetBuilderClient initialWeek={week} season={SEASON} />
    </div>
  );
}