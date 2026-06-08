#!/usr/bin/env bash
# Full local dev: free the app port, boot the dev server, warm QVAC models.
# Idempotent — safe to re-run after a crashed/orphaned `next dev`.
set -uo pipefail

PORT="${PORT:-7001}"

# 1. Kill any stale listener on the app port (the EADDRINUSE culprit).
stale="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
if [ -n "${stale}" ]; then
  echo "[dev:complete] freeing port ${PORT} (killing: ${stale})"
  # shellcheck disable=SC2086
  kill -9 ${stale} 2>/dev/null || true
  sleep 1
fi

# 2. Warm the on-device ASR + LLM models once the server answers (background).
( for _ in $(seq 1 60); do
    if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
      echo "[dev:complete] server up — warming QVAC models…"
      curl -sf -X POST "http://localhost:${PORT}/api/health" >/dev/null 2>&1 || true
      break
    fi
    sleep 1
  done ) &

# 3. Boot the full dev stack (foreground — Ctrl-C stops everything).
exec turbo dev
