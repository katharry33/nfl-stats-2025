// src/app/bet-builder/page.tsx
import { getCurrentNFLWeek } from '@/hooks/useCurrentWeek';
import { BetBuilderClient } from '@/features/BetBuilderClient';

interface PageProps {
  searchParams: { week?: string };
}

export default function BetBuilderPage({ searchParams }: PageProps) {
  const week = searchParams.week
    ? parseInt(searchParams.week, 10)
    : getCurrentNFLWeek();

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <BetBuilderClient initialWeek={week} season={2025} />
    </div>
  );
}