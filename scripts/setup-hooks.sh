#!/usr/bin/env bash
# setup-hooks.sh — symlink committed git hooks into .git/hooks/
# Run once after cloning: bash scripts/setup-hooks.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_SRC="$REPO_ROOT/.githooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

for hook in "$HOOKS_SRC"/*; do
  name="$(basename "$hook")"
  target="$HOOKS_DST/$name"

  if [[ -L "$target" ]]; then
    echo "already linked: $name"
  elif [[ -f "$target" ]]; then
    echo "skipped: $name (custom hook already exists at .git/hooks/$name)"
  else
    ln -s "$hook" "$target"
    echo "linked: $name"
  fi
done

echo "Done. Hooks installed from .githooks/"
