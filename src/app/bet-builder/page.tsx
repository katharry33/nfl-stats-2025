// apps/web/src/app/bet-builder/page.tsx  — Server Component
import { getPropsForWeek } from '@/lib/firestore/props';
import { PropsTable } from '@/components/PropsTable';

export default async function BetBuilderPage({
  searchParams
}: {
  searchParams: { week?: string }
}) {
  const week = searchParams.week ? parseInt(searchParams.week) : getCurrentNFLWeek();
  const props = await getPropsForWeek(week);

  return (
    <main>
      <h1>Bet Builder — Week {week}</h1>
      <PropsTable props={props} />
    </main>
  );
}