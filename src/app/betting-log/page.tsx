// 1. Calculate the filtered list for the Table ONLY
const filteredBets = bets.filter((bet: Bet) => {
  const searchLower = debouncedSearch.toLowerCase();
  
  // Search by Player Name in any leg or by the Bet ID
  const matchesSearch = !debouncedSearch || 
    bet.legs?.some(leg => leg.player?.toLowerCase().includes(searchLower)) ||
    bet.id.toLowerCase().includes(searchLower);
    
  return matchesSearch;
});

// 2. Count Logic for the Header
const totalCount = bets.length;
const displayCount = filteredBets.length;
const isFiltered = debouncedSearch.length > 0;

// ... inside your return JSX ...

<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">
      {sport.toUpperCase()} Betting Log
    </h1>
    <div className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
      {loading ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing with Firestore...
        </span>
      ) : (
        <>
          {isFiltered ? (
            <span>
              Showing <strong className="text-foreground">{displayCount}</strong> of {totalCount} bets
            </span>
          ) : (
            <span>{totalCount} total bets</span>
          )}
        </>
      )}
    </div>
  </div>

  <div className="flex items-center gap-2">
    {/* NBA Sync - Only visible when Sport is NBA */}
    {sport === 'nba' && (
      <button
        onClick={syncNbaResults}
        disabled={isSyncing}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 text-xs font-medium transition-colors"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        Sync NBA Stats
      </button>
    )}
    
    {/* Global Refresh */}
    <button
      onClick={() => fetchBets(debouncedSearch, 'all', sport)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  </div>
</div>

{/* ... Stats stay global ... */}
<BettingStats bets={bets} /> 

{/* ... Table shows filtered results ... */}
<BetsTable
  bets={filteredBets} 
  loading={loading}
  onDelete={handleDelete}
  onSave={handleSave}
  onEdit={bet => setEditBet(bet)}
  sweetSpotCriteria={criteria}
/>