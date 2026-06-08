# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# PWA — from app-pwa/
npm install          # install deps (needs python3 + make + g++ for better-sqlite3)
npm run dev          # Next.js dev server on :3000
npm run build        # production build (output: standalone in .next/standalone/)
npm run lint         # ESLint

# Whisper microservice — from services/whisper/
pip install -r requirements.txt
DATA_DIR=../data python -m uvicorn app:app --host 127.0.0.1 --port 8000

# n8n workflow — from repo root (Node 22 required)
node scripts/gen-n8n-workflow.mjs   # regenerates n8n/workflows/registro.json

# Docker stack — from repo root
docker compose up -d --build        # first time
docker compose exec ollama ollama pull qwen3:1.7b   # required on first boot
docker compose up -d                # subsequent starts
```

No test suite is configured.

## Architecture

Single-app layout (no monorepo). The PWA is the only deployable web process; all other services communicate over an internal Docker network.

```
/
├── app-pwa/          Next.js 15.1.7 PWA — capture, offline queue, API, .docx
├── services/whisper/ FastAPI faster-whisper (POST /transcribe)
├── n8n/workflows/    registro.json — generated, do not edit by hand
├── data/             shared volumes: audio/, docx/, sqlite/
├── cloudflared/      Cloudflare Tunnel config (named tunnel → port 3000 only)
├── scripts/          gen-n8n-workflow.mjs, arrancar-sede.bat, primer-arranque.bat
└── docker-compose.yml
```

### End-to-end flow

1. Promoter fills nombre/apellido/DNI → records WAV (16 kHz mono, max 60 s)
2. `grabar/page.tsx` calls `enqueueRegistro()` → WAV + meta saved to IndexedDB `pending` store → navigates to `/estado/<id>`
3. Service Worker (`public/sw.js`) uploads via `POST /api/audio` (multipart: field `audio` + field `meta` as JSON string) when network available; Background Sync covers app-closed case
4. `POST /api/audio` saves WAV to `data/audio/<id>.wav`, writes SQLite `RECIBIDO`, fires n8n webhook (fire-and-forget)
5. n8n: whisper → Ollama (`qwen3:1.7b`, `format: EXTRACTION_JSON_SCHEMA`) → `POST /api/informe/<id>/extraccion` → `POST /api/informe/<id>/generar-docx`
6. Status screen polls `GET /api/informe/<id>` every 4 s; SW pushes `{type:"progress", id, estado}` via postMessage for upload phase
7. Promoter downloads `.docx` from `GET /api/informe/<id>/docx`

### State machines

**Client (IndexedDB `registros` store, `RegistroEstado`):**
```
encolado → subiendo → procesando → listo
                   ↘ error (retry resets to encolado)
```

**Server (SQLite `informes` table, `InformeEstado`):**
```
RECIBIDO → EXTRAIDO → LISTO
         ↘ ERROR
```

`/estado/[id]` merges both: SW postMessage drives `encolado→subiendo`, server polling drives `procesando→listo/error`.

### Key design constraints

- **n8n never writes SQLite.** Next.js is the single SQLite writer. n8n calls HTTP endpoints (`/extraccion`, `/generar-docx`, `/error`) which delegate to `lib/db/sqlite.ts`.
- **Device-generated id.** UUID is created in `enqueueRegistro()` on the device and travels with the audio through SW → `POST /api/audio` → SQLite → n8n → back to the status screen. All layers key on this same id.
- **WAV only.** `use-recorder.ts` encodes 16 kHz mono PCM WAV via WebAudio `ScriptProcessorNode`. MediaRecorder is not used (webm produces garbled whisper transcripts).
- **`better-sqlite3` is synchronous** and listed in `serverExternalPackages` so Next.js doesn't bundle it. All SQLite access is server-side only.
- **`output: "standalone"`** in `next.config.ts` — the Docker image copies `.next/standalone/` and runs `node server.js`.

### `app-pwa/src/` structure

| Path | Role |
|------|------|
| `lib/reports/schema.ts` | Domain types: `FieldReport`, `ReportExtraction`, `ReportMetadata`, `EXTRACTION_JSON_SCHEMA` |
| `lib/reports/assemble.ts` | `SYSTEM_PROMPT`, `buildReport()`, `buildUserMessage()` — must stay in sync with `scripts/gen-n8n-workflow.mjs` |
| `lib/reports/content.ts` | `buildReportContent()` — always emits all 11 sections with `—` fallback; `reportFileBase()` builds `Apellido_Nombre_DNI_YYYY-MM-DD` |
| `lib/reports/campos.ts` | `CamposConfig` — section toggle list; `filterReportContent()` removes unchecked sections before .docx render |
| `lib/reports/report-docx.ts` | `renderReportDocxBufferFromContent()` — server-side .docx builder (used by API routes) |
| `lib/reports/generar-docx.ts` | Shared helper called by both `generar-docx` and `campos` routes |
| `lib/db/sqlite.ts` | All SQLite ops: `insertInformeRecibido`, `upsertInformeExtraido`, `setInformeListo`, `setInformeError` |
| `lib/db/paths.ts` | `dataRoot()` → `DATA_DIR` env var or `../data`; `audioPathFor(id)`, `docxPathFor(id)` |
| `lib/queue/db.ts` | IndexedDB: `pending` store (upload queue) + `registros` store (persistent list). `Beneficiario = {nombre, apellido, dni}` |
| `lib/queue/enqueue.ts` | `enqueueRegistro()` — saves to IndexedDB, calls `requestFlush()` (SW postMessage + Background Sync) |
| `lib/api/metadata.ts` | `UploadMeta` → `ReportMetadata` conversion; beneficiario shape must match `flow-context.tsx` |
| `app/flow-context.tsx` | Session state (sessionStorage): `{tipo, beneficiario}` — shared between `/registro` and `/grabar` |

### API routes (`app-pwa/src/app/api/`)

All routes set `export const runtime = "nodejs"`.

| Route | Called by |
|-------|-----------|
| `POST /api/audio` | Service Worker / page-side fallback |
| `GET /api/informe/[id]` | Status screen polling |
| `POST /api/informe/[id]/extraccion` | n8n (after Ollama) |
| `POST /api/informe/[id]/generar-docx` | n8n (after extraccion) |
| `GET /api/informe/[id]/docx` | Promoter download |
| `POST /api/informe/[id]/campos` | `/informe/[id]` page (field toggle UI) |
| `POST /api/informe/[id]/error` | n8n error branch |

### n8n workflow

`n8n/workflows/registro.json` is **generated** — edit `scripts/gen-n8n-workflow.mjs` and re-run it. The script embeds `SYSTEM_PROMPT` and `EXTRACTION_JSON_SCHEMA` verbatim from copies inside the script itself; keep these in sync with `lib/reports/assemble.ts` and `lib/reports/schema.ts` when changing the prompt or schema.

After regenerating, re-import in the n8n editor (Workflows → Import from file) and re-activate the workflow.

### Tailwind

Tailwind v4 with `@tailwindcss/postcss`. Design tokens live in `src/app/globals.css` under `@theme`. Use the custom token names (`text-on-surface`, `bg-primary-container`, `font-label-md`, etc.) — do not add a `tailwind.config.*` file.

### Environment variables

See `.env.example`. Key vars:
- `DATA_DIR` — shared volume root (default: `../data` relative to `app-pwa/`)
- `N8N_WEBHOOK_URL` — fired by `POST /api/audio`
- `OLLAMA_MODEL` — consumed by n8n Code node at runtime via `$env.OLLAMA_MODEL` (default: `qwen3:1.7b`)
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` — required for n8n Code nodes to read `$env`
