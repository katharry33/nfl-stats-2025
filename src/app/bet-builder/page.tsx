import { BetBuilderClient } from '@/features/bet-builder-client';

// 'default' is the key here to fix the "not a React Component" error
export default function BetBuilderPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <BetBuilderClient />
    </main>
  );
}