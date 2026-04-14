#!/usr/bin/env bash
# regen-dep-graphs.sh
#
# Regenerates frontend and/or backend dependency graphs.
# Called automatically by the pre-push hook with the list of changed files.
#
# Usage:
#   scripts/regen-dep-graphs.sh                  # regenerate both
#   scripts/regen-dep-graphs.sh frontend          # frontend only
#   scripts/regen-dep-graphs.sh backend           # backend only
#   scripts/regen-dep-graphs.sh <file1> <file2>   # auto-detect from changed files

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="$REPO_ROOT/.claude/context"
SCRIPTS_DIR="$REPO_ROOT/scripts"

DO_FRONTEND=false
DO_BACKEND=false

# ── Determine what to regenerate ─────────────────────────────────────────────

if [[ $# -eq 0 ]]; then
  DO_FRONTEND=true
  DO_BACKEND=true
elif [[ $# -eq 1 && "$1" == "frontend" ]]; then
  DO_FRONTEND=true
elif [[ $# -eq 1 && "$1" == "backend" ]]; then
  DO_BACKEND=true
else
  # Args are changed file paths — detect layer from extensions/paths
  for file in "$@"; do
    if [[ "$file" == frontend/src/*.ts   || \
          "$file" == frontend/src/*.tsx  || \
          "$file" =~ ^frontend/src/.*\.(ts|tsx)$ ]]; then
      DO_FRONTEND=true
    fi
    if [[ "$file" =~ ^backend/src/main/kotlin/.*\.kt$ ]]; then
      DO_BACKEND=true
    fi
  done
fi

if [[ "$DO_FRONTEND" == false && "$DO_BACKEND" == false ]]; then
  echo "[dep-graph] No tracked source files changed — skipping graph update."
  exit 0
fi

# ── Frontend ──────────────────────────────────────────────────────────────────

if [[ "$DO_FRONTEND" == true ]]; then
  echo "[dep-graph] Regenerating frontend dependency graph..."

  FRONTEND_ENTRY="$REPO_ROOT/frontend/src/App.tsx"
  WEBPACK_CONFIG="$SCRIPTS_DIR/madge-webpack.js"
  OUTPUT="$CONTEXT_DIR/frontend-dep-graph.json"

  if ! command -v npx &>/dev/null; then
    echo "[dep-graph] WARNING: npx not found — skipping frontend graph." >&2
    DO_FRONTEND=false
  elif [[ ! -f "$FRONTEND_ENTRY" ]]; then
    echo "[dep-graph] WARNING: $FRONTEND_ENTRY not found — skipping frontend graph." >&2
    DO_FRONTEND=false
  else
    cd "$REPO_ROOT/frontend"
    npx --yes madge --webpack-config "$WEBPACK_CONFIG" --json src/App.tsx 2>/dev/null \
      | python3 -c "
import json, sys
g = json.load(sys.stdin)
trimmed = {k: v for k, v in g.items() if v}
print(json.dumps(trimmed, indent=2))
" > "$OUTPUT"
    NODE_COUNT=$(python3 -c "import json; g=json.load(open('$OUTPUT')); print(len(g))")
    echo "[dep-graph] Frontend: $NODE_COUNT nodes → $OUTPUT"
    cd "$REPO_ROOT"
  fi
fi

# ── Backend ───────────────────────────────────────────────────────────────────

if [[ "$DO_BACKEND" == true ]]; then
  echo "[dep-graph] Regenerating backend dependency graph..."

  OUTPUT="$CONTEXT_DIR/backend-dep-graph.json"

  KOTLIN_SRC="$REPO_ROOT/backend/src/main/kotlin"
  if [[ ! -d "$KOTLIN_SRC" ]]; then
    echo "[dep-graph] WARNING: $KOTLIN_SRC not found — skipping backend graph." >&2
    DO_BACKEND=false
  else
    find "$KOTLIN_SRC" -name "*.kt" \
      | xargs grep -l "^import com.investment" 2>/dev/null \
      | python3 -c "
import sys, json, re
files = [l.strip() for l in sys.stdin]
graph = {}
for f in files:
    rel   = re.sub('.*/kotlin/', '', f).replace('/', '.').replace('.kt', '')
    short = rel.replace('com.investment.', '')
    with open(f) as fh:
        content = fh.read()
    imports = re.findall(r'^import com\.investment\.([^\s;]+)', content, re.MULTILINE)
    graph[short] = list(dict.fromkeys(imports)) if imports else []
trimmed = {k: v for k, v in graph.items() if v}
print(json.dumps(trimmed, indent=2))
" > "$OUTPUT"

    NODE_COUNT=$(python3 -c "import json; g=json.load(open('$OUTPUT')); print(len(g))")
    echo "[dep-graph] Backend: $NODE_COUNT nodes → $OUTPUT"
  fi
fi

# ── Stage updated graph files ─────────────────────────────────────────────────

UPDATED=()
[[ "$DO_FRONTEND" == true ]] && UPDATED+=("$CONTEXT_DIR/frontend-dep-graph.json")
[[ "$DO_BACKEND"  == true ]] && UPDATED+=("$CONTEXT_DIR/backend-dep-graph.json")

for f in "${UPDATED[@]}"; do
  if [[ -f "$f" ]]; then
    git -C "$REPO_ROOT" add "$f"
    echo "[dep-graph] Staged: ${f#$REPO_ROOT/}"
  fi
done

echo "[dep-graph] Done."

# ── Obsidian vault ────────────────────────────────────────────────────────────

if command -v python3 &>/dev/null; then
  python3 "$SCRIPTS_DIR/gen-obsidian-vault.py"
else
  echo "[dep-graph] WARNING: python3 not found — skipping Obsidian vault update." >&2
fi
