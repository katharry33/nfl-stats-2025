NBA
permanent for player IDS - seed-nba-ids.ts s
fill gaps - npx tsx scripts/find-missing-nba-ids.ts
daily workflow
# Every morning
curl "http://localhost:3000/api/nba/ingest"
curl "http://localhost:3000/api/nba/enrich?date=YYYY-MM-DD&season=2025"

# After games finish
# For a specific day
npx tsx scripts/postGameNBA_BBR.ts --date=2025-03-20 --season=2025

# To overwrite existing results
npx tsx scripts/postGameNBA_BBR.ts --date=2025-03-20 --force