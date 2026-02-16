'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface FilterBarProps {
  options: {
    teams?: string[];
    propTypes?: string[];
    weeks?: number[];
  };
}

export function FilterBar({ options }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Destructure with defaults to make the component resilient
  const { weeks = [], teams = [], propTypes = [] } = options || {};

  const updateSearch = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900 rounded-xl mb-8">
      {/* Week Filter */}
      <select 
        onChange={(e) => updateSearch('week', e.target.value)}
        className="bg-slate-800 p-2 rounded text-white border border-slate-700 focus:ring-emerald-500 focus:border-emerald-500"
        defaultValue={searchParams.get('week') || 'all'}
      >
        <option value="all">All Weeks</option>
        {weeks.map((w) => (
          <option key={w} value={w.toString()}>Week {w}</option>
        ))}
      </select>

      {/* Team Filter */}
      <select 
        onChange={(e) => updateSearch('team', e.target.value)}
        className="bg-slate-800 p-2 rounded text-white border border-slate-700 focus:ring-emerald-500 focus:border-emerald-500"
        defaultValue={searchParams.get('team') || 'all'}
      >
        <option value="all">All Teams</option>
        {teams.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Market Filter */}
      <select 
        onChange={(e) => updateSearch('type', e.target.value)}
        className="bg-slate-800 p-2 rounded text-white border border-slate-700 focus:ring-emerald-500 focus:border-emerald-500"
        defaultValue={searchParams.get('type') || 'all'}
      >
        <option value="all">All Markets</option>
        {propTypes.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
