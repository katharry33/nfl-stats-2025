import { BetBuilderClient } from '@/features/bet-builder-client';

export default function BetBuilderPage() {
  // We pass the initial config; the client-side hook will 
  // handle the fetch to /api/all-props automatically.
  return (
    <div className="min-h-screen bg-[#060606]">
      <BetBuilderClient initialWeek={1} season={2025} />
    </div>
  );
}