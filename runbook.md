NBA
Bet builder flow for daily game props

User clicks "Sync Slate" on the Dashboard.

api/nba/ingest runs, pulls lines from The Odds API, and saves them to nbaProps_2025.

User clicks "Enrich."

api/nba/enrich runs, pulls BBRef logs/TeamRankings, runs the scoring.ts math, and updates the docs.

useAllProps hook detects the refresh, calls api/props, and populates your table with EV-ready bets.