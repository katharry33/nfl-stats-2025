// src/app/bet-builder/page.tsx
import BetBuilderClient from '@/features/bet-builder-client';

const SEASON      = 2025;
const CURRENT_WEEK = 22; // Super Bowl week — update each week

interface Props {
  searchParams: { week?: string };
}

export default function BetBuilderPage({ searchParams }: Props) {
  const weekParam = searchParams?.week ? parseInt(searchParams.week, 10) : null;
  const week      = weekParam && !isNaN(weekParam) ? weekParam : CURRENT_WEEK;

  return (
    <div className="min-h-screen bg-background">
      <BetBuilderClient initialWeek={week} season={SEASON} />
    </div>
  );
}