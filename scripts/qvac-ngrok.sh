#!/usr/bin/env bash
# Publish the operator's local `qvac serve` over an ngrok tunnel so a Vercel
# deployment can use it as a LAST-FALLBACK upstream (set QVAC_NGROK_URL in
# Vercel). The local box is the fast path (Metal/GPU); this lets the deployed
# app borrow it when Railway is unavailable.
#
# Usage:  QVAC_API_KEY=<same-key-as-vercel> bun run qvac:ngrok
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/infra/qvac/qvac.config.json"
PORT="${QVAC_PORT:-11434}"

command -v ngrok >/dev/null 2>&1 || {
  echo "[x] ngrok not found. Install: https://ngrok.com/download (brew install ngrok)"; exit 1; }
command -v qvac >/dev/null 2>&1 || { echo "[*] Installing @qvac/cli..."; npm i -g @qvac/cli; }

# The tunnel is PUBLIC, and the Vercel proxy forwards QVAC_API_KEY to every
# upstream, so this server must require the SAME key Vercel uses.
KEY="${QVAC_API_KEY:-}"
if [ -z "$KEY" ]; then
  echo "[x] Set QVAC_API_KEY to the SAME value as your Vercel QVAC_API_KEY, e.g.:"
  echo "      QVAC_API_KEY=<your-railway-key> bun run qvac:ngrok"
  exit 1
fi

QVAC_PID=""; NGROK_PID=""
cleanup() { kill "$NGROK_PID" "$QVAC_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "[*] Starting qvac serve (auth + CORS) on port ${PORT} ..."
qvac serve openai -c "$CONFIG" --cors -p "$PORT" --api-key "$KEY" >/tmp/qvac-serve.log 2>&1 &
QVAC_PID=$!

echo "[*] Opening ngrok tunnel to port ${PORT} ..."
ngrok http "$PORT" --log stdout >/tmp/qvac-ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok's local API to report the public https URL.
URL=""
for _ in $(seq 1 25); do
  URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
    | python3 -c "import sys,json
try:
  t=json.load(sys.stdin).get('tunnels',[])
  print(next((x['public_url'] for x in t if x.get('public_url','').startswith('https')), ''))
except Exception:
  print('')" 2>/dev/null)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "[x] Could not read ngrok URL. Is ngrok authed? (ngrok config add-authtoken ...). See /tmp/qvac-ngrok.log"
  exit 1
fi

echo ""
echo "[ok] Local QVAC published at: ${URL}"
echo ""
echo "Wire it as the Vercel last-fallback (QVAC_NGROK_URL):"
echo "    printf '%s' \"${URL}\" | vercel env add QVAC_NGROK_URL production"
echo "    vercel --prod"
echo ""
echo "Leave this running. Ctrl+C stops both qvac serve and the tunnel."
wait
