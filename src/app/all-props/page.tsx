import { FilterBar } from '@/components/filterbar';
import { PropCard } from '@/components/propcard';
import { fetchProps, getFilterOptions } from '@/lib/firebase/server/queries';
import { PropData } from '@/lib/types';

export default async function AllPropsPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const props: PropData[] = await fetchProps({
    week: searchParams.week,
    team: searchParams.team,
    query: searchParams.query,
    type: searchParams.type,
  });

  // Correctly call getFilterOptions without the props argument.
  const filterOptions = await getFilterOptions();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Props</h1>
        <p className="text-slate-400">
          Filter and browse all available player props.
        </p>
      </header>

      <FilterBar options={filterOptions} />

      {props.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {props.map((prop) => (
            <PropCard key={prop.id} prop={prop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500">No props found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
