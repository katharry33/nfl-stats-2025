import React, { useState } from 'react';

const PROP_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'points', label: 'PTS' },
  { id: 'rebounds', label: 'REB' },
  { id: 'assists', label: 'AST' },
  { id: 'threes', label: '3PM' },
  { id: 'points_rebounds_assists', label: 'P+R+A' },
  { id: 'points_rebounds', label: 'P+R' },
  { id: 'double_double', label: '2-10s' },
];

const PropFilterBar = ({ onFilterChange }: { onFilterChange: (filterId: string) => void }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const handlePress = (filterId: string) => {
    setActiveFilter(filterId);
    onFilterChange(filterId);
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      {PROP_FILTERS.map((filter) => (
        <button
          key={filter.id}
          onClick={() => handlePress(filter.id)}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeFilter === filter.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default PropFilterBar;