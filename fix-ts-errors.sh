#!/bin/bash
# fix-ts-errors.sh
# Run from your project root: bash fix-ts-errors.sh
# Fixes all 'getAdminDb' → 'adminDb' renames + ./types.js → ./types

set -e
echo "🔧 Fixing TypeScript errors..."

# ── 1. getAdminDb → adminDb ───────────────────────────────────────────────────
FILES_ADMIN=(
  "scripts/migrate-betting-log.ts"
  "src/app/api/admin/migrate/route.ts"
  "src/app/api/all-props/debug/route.ts"
  "src/app/api/update-odds/route.ts"
  "src/lib/actions/bet-actions.ts"
  "src/lib/firebase/server/queries.ts"
)

for f in "${FILES_ADMIN[@]}"; do
  if [ -f "$f" ]; then
    # Fix import line
    sed -i 's/import { getAdminDb }/import { adminDb }/' "$f"
    sed -i 's/import { getAdminDb,/import { adminDb,/' "$f"
    # Fix all usages
    sed -i 's/getAdminDb()/adminDb/g' "$f"
    echo "  ✅ Fixed getAdminDb → adminDb in $f"
  else
    echo "  ⚠️  Not found (skip): $f"
  fi
done

# ── 2. ./types.js → ./types in enrichment files ───────────────────────────────
if [ -f "src/lib/enrichment/pfr.ts" ]; then
  sed -i "s|from './types.js'|from './types'|g" src/lib/enrichment/pfr.ts
  echo "  ✅ Fixed ./types.js → ./types in pfr.ts"
fi

# ── 3. Add explicit 'any' type to implicit doc params ────────────────────────
# admin/migrate/route.ts line ~20
if [ -f "src/app/api/admin/migrate/route.ts" ]; then
  sed -i 's/snapshot\.forEach((doc) =>/snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) =>/' \
    src/app/api/admin/migrate/route.ts
  echo "  ✅ Fixed implicit any doc param in admin/migrate/route.ts"
fi

# all-props/debug/route.ts line ~18
if [ -f "src/app/api/all-props/debug/route.ts" ]; then
  sed -i 's/snapshot\.docs\.map(doc =>/snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>/' \
    src/app/api/all-props/debug/route.ts
  echo "  ✅ Fixed implicit any doc param in all-props/debug/route.ts"
fi

# firebase/server/queries.ts line ~22
if [ -f "src/lib/firebase/server/queries.ts" ]; then
  sed -i 's/return snapshot\.docs\.map(doc =>/return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>/' \
    src/lib/firebase/server/queries.ts
  echo "  ✅ Fixed implicit any doc param in queries.ts"
fi

# ── 4. roi-chart.tsx — inline profit calc instead of 2-arg calculateNetProfit ─
# (Handled by deploying the new roi-chart.tsx from outputs/)

# ── 5. lib/bets.ts — map legacy 'win'/'loss' status ─────────────────────────
if [ -f "src/lib/bets.ts" ]; then
  # Fix line: status: leg.status ?? 'pending',
  # Replace with cast that maps 'win'→'won' and 'loss'→'lost'
  python3 - <<'PYEOF'
import re

with open("src/lib/bets.ts", "r") as f:
    content = f.read()

# Replace the status line that causes the error
old = "    status:   leg.status ?? 'pending',"
new = "    status:   (leg.status === 'win' ? 'won' : leg.status === 'loss' ? 'lost' : (leg.status ?? 'pending')) as any,"

old2 = "    status:    leg.status ?? 'pending',"
new2 = "    status:    (leg.status === 'win' ? 'won' : leg.status === 'loss' ? 'lost' : (leg.status ?? 'pending')) as any,"

content = content.replace(old, new).replace(old2, new2)

with open("src/lib/bets.ts", "w") as f:
    f.write(content)

print("  ✅ Fixed status mapping in lib/bets.ts")
PYEOF
fi

echo ""
echo "✅ Mechanical fixes complete!"
echo ""
echo "📋 NEXT: Deploy these output files from the outputs/ folder:"
echo "   outputs/types.ts              → src/lib/types.ts"
echo "   outputs/betslip-context.tsx   → src/context/betslip-context.tsx"
echo "   outputs/calculate-parlay-status.ts → src/lib/utils/calculate-parlay-status.ts"
echo "   outputs/betting-log-loader.tsx → src/components/bets/betting-log-loader.tsx"
echo "   outputs/enrichment-types.ts   → src/lib/enrichment/types.ts"
echo "   outputs/roi-chart.tsx         → src/features/tracker/roi-chart.tsx"
echo "   outputs/enrichment-utils.ts   → src/lib/enrichment/utils.ts"
echo "   outputs/scoring-additions.ts  → APPEND to src/lib/enrichment/scoring.ts"
echo ""
echo "📋 Then run: npx tsc --noEmit"