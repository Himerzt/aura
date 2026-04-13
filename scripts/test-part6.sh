#!/usr/bin/env bash
# =============================================================================
# AURA — Self-test Part 6 (Onboarding + Morning Frontend)
# =============================================================================
# Purpose: Quick static + API smoke test for the Part 6 frontend pages.
# Usage  : bash scripts/test-part6.sh
# Assumes: Project root as CWD. Docker services optional.
# =============================================================================

set -u
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
WARN=0

ok()   { echo "  [OK]   $1"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }

section() { echo ""; echo "── $1 ──"; }

# ── 1. File existence ───────────────────────────────────────────────────────
section "1. Files exist"

files=(
  "frontend/lib/api.ts"
  "frontend/lib/types.ts"
  "frontend/app/onboarding/page.tsx"
  "frontend/app/morning/page.tsx"
  "frontend/app/page.tsx"
  "frontend/components/aura/MoodOrb.tsx"
)
for f in "${files[@]}"; do
  if [ -f "$f" ]; then ok "$f"; else bad "missing $f"; fi
done

# ── 2. Structural sanity ────────────────────────────────────────────────────
section "2. Structural sanity"

check() {
  local file=$1 pattern=$2 label=$3
  if grep -q "$pattern" "$file" 2>/dev/null; then ok "$label"; else bad "$label"; fi
}

check "frontend/app/morning/page.tsx" "postMorning"           "morning page calls postMorning"
check "frontend/app/morning/page.tsx" "getProfile"            "morning page fetches profile"
check "frontend/app/morning/page.tsx" "result.type === 'crisis'" "morning page handles crisis branch"
check "frontend/app/morning/page.tsx" "result.type === 'morning'" "morning page handles morning branch"
check "frontend/app/morning/page.tsx" "setMood("              "morning page updates mood context"
check "frontend/app/onboarding/page.tsx" "onboarding_completed" "onboarding redirects completed users"
check "frontend/lib/api.ts" "/api/morning"                    "api.ts hits /api/morning"
check "frontend/lib/api.ts" "/api/profile"                    "api.ts hits /api/profile"

# ── 3. Live API smoke (optional) ────────────────────────────────────────────
section "3. Live API smoke (optional — requires docker-compose up)"

if command -v curl >/dev/null 2>&1; then
  if curl -sf --max-time 2 "http://localhost/health" >/dev/null 2>&1; then
    ok "nginx + /health reachable"

    if curl -sf --max-time 5 "http://localhost/api/profile" >/dev/null 2>&1; then
      ok "GET /api/profile responds"
    else
      warn "GET /api/profile failed (maybe profile not created yet — run onboarding)"
    fi
  else
    warn "localhost unreachable — start stack with: docker-compose up"
    warn "skipping live API checks"
  fi
else
  warn "curl not found — skipping live API checks"
fi

# ── 4. Manual-only items ────────────────────────────────────────────────────
section "4. Must be tested manually in browser"
echo "  - [ ] localhost/ loads, 'Bắt đầu Onboarding' button visible"
echo "  - [ ] /onboarding flow: 5 chat bubbles, progress dots animate"
echo "  - [ ] /onboarding completes → redirects to /morning"
echo "  - [ ] Revisiting /onboarding after completion → auto-redirect to /morning"
echo "  - [ ] /morning submit triggers loading state (MoodOrb breathe + typing dots)"
echo "  - [ ] /morning result: MoodOrb + energy bar + framework tag + tasks visible"
echo "  - [ ] Aura background color changes to match returned mood_state"
echo "  - [ ] Both Dark and Light modes render correctly"

# ── Summary ─────────────────────────────────────────────────────────────────
section "Summary"
echo "  Passed:  $PASS"
echo "  Failed:  $FAIL"
echo "  Warned:  $WARN"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: FAIL — see [FAIL] items above"
  exit 1
fi
echo "RESULT: STATIC TESTS PASS — manual browser test still required"
exit 0
