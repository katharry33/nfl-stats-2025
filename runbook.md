NBA
permanent for player IDS - seed-nba-ids.ts s
fill gaps - npx tsx scripts/find-missing-nba-ids.ts
daily workflow
# Every morning
curl "http://localhost:3000/api/nba/ingest"
curl "http://localhost:3000/api/nba/enrich?date=YYYY-MM-DD&season=2025"

# After games finish
curl -X POST http://localhost:3000/api/nba/grade \
  -H "Content-Type: application/json" \
  -d '{"date":"YYYY-MM-DD","season":2025}'