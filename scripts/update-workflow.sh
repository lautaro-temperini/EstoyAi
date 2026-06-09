#!/usr/bin/env bash
# Regenera el workflow n8n y lo importa automáticamente.
# Uso: bash scripts/update-workflow.sh   (desde la raíz del repo)
node "$(dirname "$0")/update-workflow.mjs"
