#!/usr/bin/env bash
# Full local stack in one command: start the on-device `qvac serve` (so the PWA
# uses local Metal/Vulkan inference) AND the Next dev app together.
#
# Usage:  bun run dev:qvac
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Starting local QVAC server (background)…"
bash "$ROOT/infra/qvac/start-local.sh" &
QVAC_PID=$!

# Stop the QVAC server when the dev process exits (Ctrl+C, etc.).
cleanup() { kill "$QVAC_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "▶ Starting app dev server…  (the app auto-detects the local server, else falls back to Railway)"
turbo dev
