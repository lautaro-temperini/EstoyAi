#!/usr/bin/env sh
# Keep the QVAC inference server warm.
#
# qvac serve never unloads models on idle, so a periodic touch is enough to stop
# the host (Railway, etc.) from sleeping the container — which would force a cold
# restart (re-download + reload). Pings GET /v1/models by default; set
# KEEPALIVE_CHAT=1 to also fire a 1-token completion that keeps the LLM engine
# hot.
#
# Env:
#   QVAC_BASE_URL   required — e.g. https://xxx.up.railway.app
#   QVAC_API_KEY    optional — sent as Authorization: Bearer <key>
#   INTERVAL        seconds between pings (default 300)
#   KEEPALIVE_MODEL model id for the optional chat ping (default llama-1b)
#   KEEPALIVE_CHAT  1 → also send a tiny chat completion
#   KEEPALIVE_ONCE  1 → ping once and exit (for Railway Cron / crontab)
set -u

BASE="${QVAC_BASE_URL:?set QVAC_BASE_URL (e.g. https://xxx.up.railway.app)}"
BASE="${BASE%/}"
INTERVAL="${INTERVAL:-300}"
MODEL="${KEEPALIVE_MODEL:-llama-1b}"
AUTH=""
[ -n "${QVAC_API_KEY:-}" ] && AUTH="Authorization: Bearer ${QVAC_API_KEY}"

ping_once() {
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 ${AUTH:+-H "$AUTH"} "$BASE/v1/models")
  echo "[keepalive] GET /v1/models -> $code"
  if [ "${KEEPALIVE_CHAT:-0}" = "1" ]; then
    ccode=$(curl -s -o /dev/null -w '%{http_code}' -m 60 \
      -H "Content-Type: application/json" ${AUTH:+-H "$AUTH"} \
      -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":1,\"stream\":false}" \
      "$BASE/v1/chat/completions")
    echo "[keepalive] POST /v1/chat/completions ($MODEL) -> $ccode"
  fi
}

if [ "${KEEPALIVE_ONCE:-0}" = "1" ]; then
  ping_once
  exit 0
fi

echo "[keepalive] warming $BASE every ${INTERVAL}s (chat=${KEEPALIVE_CHAT:-0})"
while true; do
  ping_once
  sleep "$INTERVAL"
done
