# CLAUDE.md

Guidance for working in the Pequeños Pasos repository.

## Commands

```bash
cd app-pwa && npm install   # install PWA deps
npm run dev                 # from repo root → Next.js on :3000
npm run build
npm run lint
```

Whisper microservice (local):

```bash
cd services/whisper && pip install -r requirements.txt
DATA_DIR=../data python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

No test suite is configured.

## Architecture

Single-app layout (no monorepo):

| Path | Role |
|------|------|
| `app-pwa/` | Next.js 15 PWA — capture, offline queue, API, .docx generation |
| `services/whisper/` | faster-whisper FastAPI (`POST /transcribe`) |
| `n8n/workflows/` | Orchestration (whisper → Ollama → SQLite → generar-docx) |
| `data/` | Shared volumes: `audio/`, `docx/`, `sqlite/` |

### Flow

1. Promoter records WAV (16 kHz, 60 s cap) → IndexedDB queue → `POST /api/audio`
2. PWA saves audio + SQLite `RECIBIDO`, fires n8n webhook
3. n8n: whisper → Ollama extraction → `POST /api/informe/[id]/generar-docx`
4. Promoter polls `/estado/[id]` until `LISTO`, downloads `.docx`

### Key API routes (`app-pwa`)

- `POST /api/audio` — receive WAV + metadata
- `GET /api/informe/[id]` — processing state
- `POST /api/informe/[id]/generar-docx` — build .docx (called by n8n)
- `GET /api/informe/[id]/docx` — download

### Environment

See `.env.example` for sede/Docker variables (`DATA_DIR`, `N8N_WEBHOOK_URL`, `OLLAMA_MODEL`, etc.).
