#!/bin/bash
# Session-start hook for Claude Code on the web.
#
# Installs npm dependencies so tests, lint and typecheck work in the
# sandbox. Idempotent (safe to re-run). Does NOT launch `next dev` —
# the dev server is opt-in to avoid burning compute when not needed.
set -euo pipefail

# Web-environment only (locally you already have your own setup).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$PWD}"

# Quick no-op if node_modules already populated for this lockfile.
if [ -d node_modules ] && [ -f node_modules/.package-lock.json ] &&
   cmp -s package-lock.json node_modules/.package-lock.json; then
  echo "[session-start] dependencies already up to date"
  exit 0
fi

echo "[session-start] installing npm dependencies…"
# `install` (not `ci`) so the cached container survives partial state and
# minor lockfile edits without wiping node_modules every time.
npm install --no-audit --no-fund

echo "[session-start] done."
