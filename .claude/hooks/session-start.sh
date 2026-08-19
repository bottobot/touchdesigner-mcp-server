#!/bin/bash
# Claude Code on the web — SessionStart hook for touchdesigner-mcp-server.
#
# Prepares the container so every session starts with a working MCP server:
#   1. installs Node dependencies (@modelcontextprotocol/sdk, cheerio, zod)
#   2. smoke-tests the data manager + all 21 knowledge tool handlers
#
# Synchronous by design: the session waits until this finishes, which guarantees
# dependencies exist before the agent runs anything. Runs only in the remote
# (cloud) environment; it is a no-op on a local machine.
set -euo pipefail

# Only run in Claude Code on the web. Remove this guard to also run locally.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "[setup] node $(node -v), npm $(npm -v)"

# 1) Dependencies. `npm install` (not `npm ci`) so the cached container layer is
#    reused on later runs; the script is safe to run repeatedly.
echo "[setup] installing npm dependencies…"
npm install --no-audit --no-fund

# 2) Smoke test. scripts/validate.js boots the real OperatorDataManager and
#    exercises all 21 knowledge tools, exiting non-zero on any regression.
#    Verbose handler logging goes to a file so it does not flood session context.
LOG="/tmp/td-mcp-validate.log"
echo "[setup] validating operator data + tool handlers…"
if node scripts/validate.js >"$LOG" 2>&1; then
  echo "[setup] $(grep -E 'VALIDATION:' "$LOG" | tail -1)"
else
  echo "[setup] VALIDATION FAILED — last 20 lines:"
  tail -20 "$LOG"
  exit 1
fi

echo "[setup] ready."
