#!/usr/bin/env bash
# One-command launcher for the operator's device: detect the device, ensure the
# QVAC CLI is installed, and start the local OpenAI-compatible server. The PWA
# auto-detects this server (localhost:11434) and uses it for fast, offline,
# on-device inference — otherwise it falls back to the Railway server.
#
# Usage:  bun run qvac        (or)   bash infra/qvac/start-local.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # infra/qvac
CONFIG="$DIR/qvac.config.json"
PORT="${QVAC_PORT:-11434}"

# ── Detect the device ──────────────────────────────────────────────────────
OS="$(uname -s)"; ARCH="$(uname -m)"
case "$OS" in
  Darwin) [ "$ARCH" = "arm64" ] && BACKEND="Metal GPU (fast)" || BACKEND="CPU (Intel Mac)";;
  Linux)  BACKEND="Vulkan/CPU";;
  *)      BACKEND="CPU";;
esac
echo "🩺 Device: $OS/$ARCH → $BACKEND"

# ── Ensure the QVAC CLI ────────────────────────────────────────────────────
if ! command -v qvac >/dev/null 2>&1; then
  echo "📦 Installing @qvac/cli (one-time)…"
  npm i -g @qvac/cli
fi
echo "   qvac $(qvac --version 2>/dev/null || echo '?')"

# ── Warn if the port is busy (e.g. Ollama also defaults to 11434) ──────────
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  Port $PORT is already in use (Ollama also uses 11434)."
  echo "    Stop it, or run on another port:  QVAC_PORT=11500 bash infra/qvac/start-local.sh"
  echo "    (then set NEXT_PUBLIC_QVAC_LOCAL_URL=http://localhost:11500)"
  exit 1
fi

echo "🚀 qvac serve openai → http://localhost:$PORT  (CORS on)"
echo "   First run downloads the models (~GB) then caches them. Leave this running;"
echo "   open the app and it will use this device automatically."
exec qvac serve openai -c "$CONFIG" --cors -p "$PORT"
