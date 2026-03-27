import BetBuilderClient from '@/features/bet-builder-client';
import { PropDoc } from '@/lib/types';

export default function BetBuilderPage() {
  const initialData: PropDoc[] = [];   // typed correctly
  const league: 'nba' | 'nfl' = 'nba';

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <BetBuilderClient initialData={initialData} league={league} />
    </main>
  );
}
