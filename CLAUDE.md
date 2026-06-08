# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install                  # install all workspace deps

bun run dev                  # Next.js app only on :7001 (uses deployed QVAC server)
bun run dev:qvac             # app + local qvac serve on :11434 (full offline stack)
bun run qvac                 # local qvac serve only (Metal GPU)
bun run qvac:ngrok           # expose local qvac via ngrok (set QVAC_API_KEY first)

bun run build                # turbo build (all packages)
bun run lint                 # turbo lint
```

No test suite is configured.

## Architecture

**Monorepo**: Turborepo + Bun workspaces. Two packages:
- `apps/app` — Next.js 16 PWA (UI + proxy)
- `packages/qvacs` — server-only `@qvac/sdk` wrapper; **never import this in the browser or in `/api/qvac`** — the native `bare` runtime crashes on Vercel

### Inference pipeline

Audio is captured as WAV (16kHz, 60s cap) in the browser, then routed through a 4-tier fallback:

```
1. Local qvac serve (localhost:11434) — offline, Metal/Vulkan GPU
2. Same-origin proxy /api/qvac       — forwards to Railway or ngrok
3. In-browser transformers.js         — last resort, no server needed
```

**Mode** (`"online"` | `"offline"`) is persisted in `localStorage` ("ngo-inference-mode"). In `"online"` mode the proxy is always used. In `"offline"` mode the app tries local `qvac serve` first; if unavailable it falls back to transformers.js.

**Entry point for all inference**: `apps/app/src/lib/inference/index.ts` — `inferTranscribe` and `inferExtract` select the right backend.

**Browser QVAC client**: `apps/app/src/lib/qvac/client.ts` — capability-based probe (checks `/v1/models` for a Whisper + an LLM before committing). Uses the model ids the server actually reports, so it works with any alias.

**Server proxy**: `apps/app/src/app/api/qvac/[...path]/route.ts` — plain HTTP forwarder to `QVAC_BASE_URL` (Railway) then `QVAC_NGROK_URL`. Injects `QVAC_API_KEY` server-side. Do not import any QVAC SDK here.

### Report data flow

1. **Record** (`/grabar`) — push-to-talk WAV capture, reads `FlowContext` (tipo + beneficiario set earlier in `/` and `/registro`)
2. **Transcribe** — `inferTranscribe` → Whisper
3. **Extract** — `inferExtract` → LLM constrained by `EXTRACTION_JSON_SCHEMA` (grammar-constrained JSON, enforced via `response_format: json_schema`)
4. **Assemble** — `buildReport` in `apps/app/src/lib/reports/assemble.ts` wraps extraction into a `FieldReport` with metadata + estado `"PENDIENTE"`
5. **Store** — `putReport` in `apps/app/src/lib/reports/store-client.ts` → IndexedDB (`halketon-reports`)
6. **Review** (`/informe/[id]`) — confirm → `"CONFIRMADO"`, or export to `.docx` / `.pdf`

### Key types (`apps/app/src/lib/reports/schema.ts`)

- `FieldReport` — persisted record (extends `ReportExtraction` + transcript + metadata + estado)
- `ReportExtraction` — LLM output: `resumen`, `prioridad`, `entidades`, `accionesPendientes`, `datos` (`DatosInforme`)
- `EXTRACTION_JSON_SCHEMA` — the JSON Schema passed to `response_format.json_schema`; the LLM is constrained to this exact shape
- `Prioridad`: `"ALTA" | "MEDIA" | "BAJA"` — `ALTA` only for explicit medical/safety emergencies
- `Estado`: `"PENDIENTE" | "CONFIRMADO"`

### LLM level selection (`apps/app/src/lib/llm-level.ts`)

Operators can pick a model quality level (stored in `localStorage`). When running against a local `qvac serve` the preferred model is used if available; otherwise the target's default is used.

### Flow state (`apps/app/src/app/flow-context.tsx`)

`FlowProvider` holds `{ tipo, beneficiario }` in `sessionStorage` across page navigations within a session. The flow is: `/` (tipo) → `/registro` (beneficiario) → `/grabar` (record) → `/informe/[id]` (review).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `QVAC_BASE_URL` | Vercel | Railway upstream for the proxy |
| `QVAC_NGROK_URL` | Vercel | ngrok fallback upstream for the proxy |
| `QVAC_API_KEY` | Vercel | Injected server-side into proxy requests |
| `NEXT_PUBLIC_QVAC_LOCAL_URL` | build | Local server URL (default `http://localhost:11434`) |
| `NEXT_PUBLIC_QVAC_LOCAL_KEY` | build | API key for the local server |
| `NEXT_PUBLIC_QVAC_ASR_MODEL` | build | ASR model alias override for remote |
| `NEXT_PUBLIC_QVAC_REMOTE_LLM` | build | LLM model alias override for remote |
| `NEXT_PUBLIC_QVAC_ASR_LANG` | build | Language for Whisper (default `es`) |

## Models (configured in `infra/qvac/qvac.config.json`)

| Alias | Source | Notes |
|---|---|---|
| `whisper-base` | `WHISPER_BASE_Q8_0` | ASR, multilingual |
| `llama-1b` | `LLAMA_3_2_1B_INST_Q4_0` | Default LLM (CPU-safe) |
| `qwen3-1.7b` | `QWEN3_1_7B_INST_Q4` | Better quality |
| `qwen3-4b` | `QWEN3_4B_INST_Q4_K_M` | Best quality (GPU only) |

Offline (browser) models: `Xenova/whisper-base` and `onnx-community/Qwen2.5-0.5B-Instruct` via transformers.js.
