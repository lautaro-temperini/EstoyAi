# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Comandos frecuentes

```bash
# Desarrollo local (solo PWA, sin Docker)
cd app-pwa && npm install
npm run dev          # desde la raíz: npm run dev

# Build / lint
npm run build
npm run lint

# Stack completo en Docker (sede)
docker compose up -d
docker compose down

# Regenerar el workflow de n8n tras cambiar prompt o schema
node scripts/gen-n8n-workflow.mjs
# Luego reimportar en n8n: Workflows → Import from file → n8n/workflows/registro.json

# Actualizar workflow sin abrir n8n (requiere stack corriendo)
scripts/update-workflow.bat    # Windows
```

No hay suite de tests automatizados en este repositorio.

---

## Arquitectura

El sistema tiene **dos modos de ejecución**:

1. **Desarrollo local**: solo `app-pwa` con `npm run dev`. Sin transcripción ni LLM; útil para iterar en la UI.
2. **Sede (producción)**: stack Docker completo. Los promotores acceden vía Cloudflare Tunnel.

### Servicios Docker (`docker-compose.yml`)

| Servicio  | Puerto host | Rol                                          |
| --------- | ----------- | -------------------------------------------- |
| `app-pwa` | 3000        | Next.js 15 PWA + API REST + SQLite           |
| `n8n`     | 5678        | Orquestador del pipeline audio→docx          |
| `whisper` | interno     | faster-whisper `medium`, POST /transcribe    |
| `ollama`  | interno     | LLM local gemma3:4b, extracción estructurada |

Red interna Docker: `sede-net`. Volumen compartido `data` entre `app-pwa` y `whisper`.

### Flujo de datos

```
Promotor → elige programa (Primera Infancia / Niñez-Adolescencia / Oficios)
  → registra beneficiario → graba WAV (WebAudio 16kHz) → IndexedDB (pending)
  → Service Worker Background Sync → POST /api/audio
  → SQLite: RECIBIDO + fire-and-forget webhook → n8n
  → n8n: whisper (transcripción) → ollama (extracción JSON) → POST /extraccion → POST /generar-docx
  → SQLite: LISTO → promotor descarga .docx
```

El estado se fusiona entre cliente (IndexedDB) y servidor (SQLite). Ver ARCHITECTURE.md para el diagrama completo.

El `programa` orienta el system prompt en n8n (`systemPromptForPrograma`); el `tenant` lo decide el servidor por el header `Host`, no el cliente.

### Estructura de `app-pwa/src/`

- **`app/`** — Rutas Next.js App Router
  - `api/audio/` — recibe el WAV, escribe SQLite, dispara n8n
  - `api/informe/[id]/` — endpoints que n8n llama de vuelta (`extraccion`, `generar-docx`, `error`, `docx`, `campos`, `subir-r2`, `podio`)
  - `registro/` (elige programa) → `registro/beneficiario/` → `grabar/`, `estado/[id]/`, `informe/[id]/`, `registros/` — páginas del flujo del promotor
  - `flow-context.tsx` — contexto del flujo de captura (programa, tipo, beneficiario) persistido en `sessionStorage`
- **`lib/reports/`** — pipeline de generación de informes
  - `schema.ts` — tipos `FieldReport`, `ReportExtraction`, `ReportMetadata`, `Programa`, `EXTRACTION_JSON_SCHEMA` (grammar para Ollama)
  - `assemble.ts` — `SYSTEM_PROMPT` (+ variantes por programa), `systemPromptForPrograma()`, `buildUserMessage()`, `buildReport()` (incluye limpieza de placeholders de modelos chicos)
  - `content.ts` — `buildReportContent()`: transforma `FieldReport` → `ReportContent` (encabezado fijo + 7 secciones de cuerpo siempre presentes); `reportFileBase()`, `beneficiarioFolder()`
  - `campos.ts` — `filterReportContent()`: oculta secciones según toggle del promotor
  - `report-docx.ts` — `renderReportDocxBufferFromContent()`: genera el `.docx`
  - `generar-docx.ts` — orquesta content → filter → render
- **`lib/api/`** — helpers de las API routes (`metadata.ts`: `parseUploadMeta`/`toReportMetadata`; `validate.ts`: `assertValidId` UUID-v4 anti path-traversal)
- **`lib/queue/`** — IndexedDB del cliente (`db.ts`, `enqueue.ts`)
- **`lib/db/`** — SQLite del servidor (`sqlite.ts`, `paths.ts`)
- **`lib/tenants/`** — multi-tenant Edge-safe (`config.ts`: resolución por Host, passwords, landing apex)
- **`components/`** — componentes UI reutilizables

### n8n workflow

`n8n/workflows/registro.json` es **generado automáticamente** por `scripts/gen-n8n-workflow.mjs`. **No editar a mano.**

Al modificar los system prompts (`assemble.ts`) o `EXTRACTION_JSON_SCHEMA` (`schema.ts`), también hay que actualizar las copias en `gen-n8n-workflow.mjs` y regenerar el workflow. El gen script mantiene los prompts por programa (`PROMPTS["<programa>"]` y override `PROMPTS["<tenant>:<programa>"]`) y selecciona el modelo con `$env.OLLAMA_MODEL` (fallback `qwen3:1.7b` en el workflow).

El workflow `subir-r2.json` (integración Cloudflare R2) se genera con `scripts/gen-subir-r2.mjs`.

### Invariantes críticos

- **El UUID nace en el dispositivo** (`enqueueRegistro()`), es la clave primaria en IndexedDB, SQLite y filesystem (`data/audio/<id>.wav`, `data/docx/<id>.docx`). Las API routes validan que sea UUID-v4 (`assertValidId`).
- **n8n nunca escribe SQLite**. Solo llama endpoints HTTP de `app-pwa`.
- **El LLM nunca inventa datos**. Campos vacíos → `""` o `[]`. El JSON Schema grammar lo fuerza; `buildReport()` además limpia placeholders ("[No especificada]", "N/A", …) que los modelos chicos emiten pese al prompt.
- **El `tenant` lo decide el servidor por `Host`** (middleware → `x-tenant`), nunca el cliente. El `programa` viaja en la meta del upload y orienta el system prompt.
- **WAV 16kHz via WebAudio**, no MediaRecorder/WebM (produce artefactos que degradan la transcripción).
- **`buildReportContent()` siempre emite el encabezado fijo + las 7 secciones de cuerpo**. Valores vacíos → `"—"`; listas vacías → `["—"]`.

---

## Variables de entorno relevantes

Ver `.env.example`. Las más importantes al desarrollar:

| Variable                       | Efecto                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| `DATA_DIR`                     | Directorio de audio, docx y sqlite (default: `../data`)            |
| `N8N_WEBHOOK_URL`              | URL del webhook n8n (default: `http://n8n:5678/webhook/registro`)  |
| `OLLAMA_MODEL`                 | Modelo LLM (default: `gemma3:4b`; alternativa lenta: `qwen3:1.7b`) |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Debe ser `false` para que n8n lea env vars en Code nodes           |

---

## Referencia de arquitectura

Ver `ARCHITECTURE.md` para: diagrama de componentes, flujo de datos, máquinas de estado cliente/servidor, modelo de dominio y decisiones técnicas.

Ver `DESIGN.md` para el design system UI (tokens, tipografía, motion).
