# Halketon — Smart NGO Voice Reports

An **offline-first** progressive web app for humanitarian field operators: dictate a
finding by voice and get a structured field report — **speech-to-text and reasoning run
on-device** via [QVAC](https://github.com/tetherto/qvac), not in the cloud.

Turborepo monorepo on [Bun](https://bun.sh); the app is a [Next.js 16](https://nextjs.org)
PWA. Inference is served by QVAC's OpenAI-compatible server (`qvac serve`).

---

## Why QVAC — why this approach is superior

Field work for an NGO means **sensitive data** (beneficiary names, health status, minors)
captured where there's **no reliable network**. Shipping that to a cloud LLM API is the
wrong default. QVAC runs the entire pipeline — **Whisper (speech-to-text) + an LLM
(structured extraction)** — locally on the operator's device.

| | Cloud LLM API (OpenAI, etc.) | **Halketon + QVAC (on-device)** |
| --- | --- | --- |
| **Data privacy** | Beneficiary PII/health leaves the device to a third party | **Never leaves the device** |
| **Connectivity** | Requires the internet; useless in the field | **Works fully offline** |
| **Cost** | Per-token billing, scales with usage | **$0 per inference** — your hardware |
| **Latency** | Network round-trip + provider queue | **Sub-2s** on the operator's GPU (Metal) |
| **Rate limits** | Throttled by the provider | None — local |
| **Compliance** | Data-processing agreements, residency risk | Data residency by construction |

Private, free to run, and works where the network doesn't — exactly what humanitarian
field reporting needs.

## Architecture — device-first, with graceful fallback

Inference resolution is **capability-based** and prioritizes the operator's own hardware,
falling through only when needed so it **never fails**:

```
Browser (PWA)  — records WAV @16kHz, 60s cap
   │
   ├─ 1. Local device   qvac serve on localhost (Metal/Vulkan GPU)  ← fast · private · offline
   ├─ 2. Device tunnel   the operator's box via ngrok (qvac:ngrok)   ← borrow the GPU over the net
   ├─ 3. Railway server  qvac serve in a container (CPU)             ← always-on safety net
   └─ 4. In-browser      transformers.js (online | offline toggle)   ← last resort, no server
   │
   ▼  Whisper → LLM (grammar-constrained JSON) → FieldReport
   ▼  IndexedDB on-device (offline-first)  ·  export to Word / PDF
```

- The browser calls an **OpenAI-compatible** API (`/v1/audio/transcriptions`,
  `/v1/chat/completions`). It probes `localhost:11434` and uses it **only if it actually
  serves a Whisper + an LLM** (so an unrelated server like Ollama is skipped). In offline
  mode it **detects an already-downloaded in-browser model and continues straight to the
  flow** — the download gate appears only when the weights aren't present yet.
- Vercel hosts only the **static PWA + a thin proxy** (`/api/qvac`) that forwards to the
  remote QVAC server with the key kept server-side, trying upstreams in order
  (`QVAC_BASE_URL` then `QVAC_NGROK_URL`). **`@qvac/sdk` is never bundled** — its native
  `bare` runtime can't run in serverless functions, which is exactly why inference lives
  on a real device/container.
- Reports persist in **IndexedDB**, so capture and review work with no backend at all.

## The flow (mobile, Spanish)

1. **Tipo de registro** — individual beneficiary vs group activity
2. **Datos del beneficiario** — DNI + name
3. **Grabación** — push-to-talk (60s cap, live countdown); audio stays on-device
4. **Revisión** — AI report: resumen, prioridad (ALTA/MEDIA/BAJA), entities, pending
   actions, full transcript, metadata — confirm, retry, or export to **.docx / .pdf**

## Data model (JSON)

`audio → Whisper → LLM` produces two layers.

### 1. LLM extraction (grammar-constrained)

The model gets the transcript and returns **only** these fields, enforced by JSON Schema
(`responseFormat: json_schema`) in
[`apps/app/src/lib/reports/schema.ts`](apps/app/src/lib/reports/schema.ts). The prompt
forces it to summarize **only what was said** (no hallucination):

| Field | Type | Captures |
|---|---|---|
| `resumen` | `string` | 1–2 sentence executive summary |
| `prioridad` | `"ALTA" \| "MEDIA" \| "BAJA"` | Visual triage; `ALTA` only on explicit medical/safety emergency |
| `entidades.nombres` / `.fechas` | `string[]` | Proper names / dates said literally (`[]` if none) |
| `accionesPendientes` | `string[]` | Follow-up tasks |
| `datos` | object | Structured body (demographics, metrics, socioeconomic, intervention, follow-up, narrative) — empty fields left blank |

### 2. Persisted report (`FieldReport`)

Stored **in the browser's IndexedDB** (offline-first). Wraps the extraction and adds the
verbatim transcript, auto-captured metadata, and record state (`PENDIENTE` → `CONFIRMADO`).

## Run it

```bash
bun install

# Full local stack (app + on-device QVAC server) — recommended:
bun run dev:qvac          # app on :7001, qvac serve on :11434 (Metal GPU)

# Or separately:
bun run qvac              # just the local QVAC server
bun run dev               # just the app (uses the deployed QVAC server)
```

The first run downloads the models (~GB) once, then everything works offline.

### Expose your device to a deployment

```bash
QVAC_API_KEY=<key> bun run qvac:ngrok   # publishes localhost via ngrok; prints how to set QVAC_NGROK_URL
```

### Always-on fallback (Railway)

`infra/qvac/` has a `Dockerfile` (full Vulkan + ffmpeg runtime) and `qvac.config.json`
(model aliases, preloaded) for running `qvac serve openai` on Railway. On Vercel set
`QVAC_BASE_URL` + `QVAC_API_KEY` (and optionally `QVAC_NGROK_URL`).

## Structure

```
.
├── apps/app/                 # Next.js 16 PWA (UI + /api/qvac proxy)
│   └── src/lib/qvac/         # browser QVAC client (target resolution)
│   └── src/lib/inference/    # online/offline mode + transformers.js engine
│   └── src/lib/reports/      # prompt/schema, assembly, IndexedDB store, export
├── packages/qvacs/           # @repo/qvacs — server-only @qvac/sdk wrapper
└── infra/qvac/               # Railway Dockerfile + qvac.config + local launchers
```

## Models

| Stage | Model |
|---|---|
| ASR | `WHISPER_BASE_Q8_0` (multilingual, `es`) · offline: `Xenova/whisper-base` |
| LLM | `LLAMA_3_2_1B_INST_Q4_0` / `QWEN3_1_7B_INST_Q4` · offline: `onnx-community/Qwen2.5-0.5B-Instruct` |

Built with the [QVAC SDK](https://docs.qvac.tether.io) — on-device AI for private,
offline, zero-cost inference.
