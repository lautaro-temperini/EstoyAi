# ARCHITECTURE.md — EstoyAi

Vista de arquitectura del monorepo. Para flujo de datos detallado, estados y modelo de dominio ver [DESIGN.md](DESIGN.md). Para operación diaria ver [CLAUDE.md](CLAUDE.md) y [README-SEDE.md](README-SEDE.md).

---

## Visión general

EstoyAi es un sistema **offline-first** en dos capas:

| Capa | Dónde corre | Rol |
|---|---|---|
| **Cliente** | Navegador del promotor (PWA) | Captura audio, cola offline, UI |
| **Sede** | PC de la ONG (Docker) | ASR, LLM, persistencia, generación docx |

Una sola instalación de sede puede servir **varias ONGs** vía subdominios (`MULTITENANT.md`).

---

## Topología de despliegue

```
                    Internet
                        │
              Cloudflare Tunnel
                        │
                        ▼
              localhost:3000 (app-pwa)
                        │
        ┌───────────────┼───────────────┐
        │         sede-net            │
        │  app-pwa ──► n8n            │
        │     │           │           │
        │     │      whisper          │
        │     │           │           │
        │     │        ollama         │
        │     └──── data volume ──────┘
        │           (audio/docx/sqlite)
        └─────────────────────────────┘
```

**Acceso:**
- Apex `estoyai.com` → landing institucional (sin auth).
- `<tenant>.estoyai.com` → app operativa con Basic Auth.
- n8n editor → `localhost:5678` (solo sede, no expuesto por tunnel).

---

## Modos de ejecución

### 1. Desarrollo local (`npm run dev`)

- Solo `app-pwa` en `:3000`.
- Sin Whisper, Ollama ni n8n → pipeline no funciona.
- Útil para UI, rutas y API mocks manuales.

### 2. Sede completa (`docker compose up -d`)

- Cuatro servicios: `app-pwa`, `n8n`, `whisper`, `ollama`.
- Promotores acceden vía tunnel HTTPS.
- SQLite y archivos en volumen `data`.

---

## Estructura del repositorio

```
EstoyAi/
├── app-pwa/                 # Next.js 15 PWA + API (núcleo del producto)
│   └── src/
│       ├── app/             # App Router: páginas + route handlers
│       ├── lib/reports/     # Schema, prompt, content, docx
│       ├── lib/queue/       # IndexedDB cliente
│       ├── lib/db/          # SQLite servidor
│       └── lib/tenants/     # Multi-tenant (Edge-safe)
├── services/whisper/        # Microservicio ASR (Python)
├── n8n/workflows/           # registro.json, subir-r2.json (generados)
├── scripts/                 # gen-n8n-workflow, update-workflow, estado
├── cloudflared/             # Referencia config tunnel
├── PequenosPasos/           # Instalador Windows para sede
├── docs/                    # brief, prd, trd (local, .gitignore)
└── skills/                  # Agent skills diseño/marketing (local, .gitignore)
```

---

## Fronteras de responsabilidad

| Límite | Regla |
|---|---|
| Cliente ↔ Servidor | `POST /api/audio` (multipart); polling `GET /api/informe/[id]` |
| Servidor ↔ n8n | Webhook fire-and-forget; n8n llama de vuelta HTTP |
| n8n ↔ SQLite | **Prohibido** — solo app-pwa escribe SQLite |
| LLM ↔ Datos | Solo extrae de transcripción; grammar JSON obligatorio |
| Identificador | UUID nace en `enqueueRegistro()` y atraviesa todo el pipeline |

---

## Stack tecnológico

| Área | Elección |
|---|---|
| Frontend | Next.js 15, React, App Router, PWA |
| Audio cliente | WebAudio → WAV 16 kHz mono |
| Persistencia servidor | better-sqlite3 + filesystem |
| Orquestación | n8n 2.8.4 |
| ASR | faster-whisper `medium`, español |
| LLM | Ollama gemma3:4b local |
| Informes | docx generado en Node (`report-docx.ts`) |
| Acceso remoto | Cloudflare Tunnel |
| Contenedores | Docker Compose, red `sede-net` |

---

## Flujo de datos (resumen)

```
Promotor graba → IndexedDB (encolado)
  → SW Background Sync → POST /api/audio
  → SQLite RECIBIDO + webhook n8n
  → whisper → ollama → POST extraccion → POST generar-docx
  → SQLite LISTO
  → Promotor descarga .docx
```

Diagrama completo y máquinas de estado: [DESIGN.md](DESIGN.md).

---

## Configuración y extensibilidad

| Extender | Dónde |
|---|---|
| Nueva ONG | `tenants/config.ts`, `.env`, Cloudflare hostname |
| Prompt por programa | `assemble.ts` + `gen-n8n-workflow.mjs` → regenerar workflow |
| Integración R2/Podio | Workflows n8n + env en `docker-compose.yml` |
| Schema de extracción | `schema.ts` (sincronizar en gen script) |

---

## Documentación relacionada

| Documento | Contenido |
|---|---|
| [DESIGN.md](DESIGN.md) | Diseño detallado, estados, invariantes |
| [CLAUDE.md](CLAUDE.md) | Comandos y guía para agentes de código |
| [README-SEDE.md](README-SEDE.md) | Manual operativo para coordinadores |
| [MULTITENANT.md](MULTITENANT.md) | Subdominios, tunnel, R2 |
| [docs/brief.md](docs/brief.md) | Brief de producto (local) |
| [docs/prd.md](docs/prd.md) | Requisitos de producto (local) |
| [docs/trd.md](docs/trd.md) | Requisitos técnicos (local) |
