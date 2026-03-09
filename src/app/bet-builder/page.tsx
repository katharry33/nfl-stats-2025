// src/app/bet-builder/page.tsx
import { BetBuilderClient } from '@/features/bet-builder-client';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';

const SEASON = 2025;

interface Props {
  searchParams: { week?: string };
}

export default function BetBuilderPage({ searchParams }: Props) {
  const weekParam = searchParams?.week ? parseInt(searchParams.week) : null;
  const week = weekParam && !isNaN(weekParam) ? weekParam : getCurrentNFLWeek(SEASON);

  return (
    <div className="min-h-screen bg-[#060606]">
      <BetBuilderClient initialWeek={week} season={SEASON} />
    </div>
  );
}