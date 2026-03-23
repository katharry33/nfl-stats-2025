NBA
Bet builder flow for daily game props

User clicks "Sync Slate" on the Dashboard.

api/nba/ingest runs, pulls lines from The Odds API, and saves them to nbaProps_2025.

User clicks "Enrich."

api/nba/enrich runs, pulls BBRef logs/TeamRankings, runs the scoring.ts math, and updates the docs.

useAllProps hook detects the refresh, calls api/props, and populates your table with EV-ready bets.

The "Full Picture" of your backendNow that you've shared both files, here is how they work together:FilePurposeWhen it runsenrichProps.ts (Previous)The Batch Manager. Handles the "Pass 1" and "Pass 2" (Combos) and talks directly to Firestore.When you click "Fill Gaps" or upload a massive CSV.enrichSingleProp.ts (Current)The Math Engine. Calculates the actual probabilities, Kelly Fraction, and Edge for a single player.Called by the Batch Manager for every row in your table.

The "Fill Gaps" Logic ChainHere is a high-level view of how the data flows when you click that button. If any step fails, the "Gaps" won't fill:StepActionPotential Failure Point1. UIButton sends POST to /api/enrich.Payload missing season or collection string.2. RouteRoute calls enrichAllPropsCollection.Collection name mismatch (Fixed above).3. Pre-passSchedule lookup for gameDate.matchup string (e.g. "KC @ BUF") doesn't match static schedule.4. PFRScraper fetches player logs.Player has a suffix (Jr., III) not in the ID map.5. BatchFirestore batch.update().Exceeding 500 docs per batch (Your code uses 400, which is safe).