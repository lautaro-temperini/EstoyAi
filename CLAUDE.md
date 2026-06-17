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

# Regenerar el workflow de n8n tras cambiar prompt o schema (global, todas las ONGs)
node scripts/gen-n8n-workflow.mjs
# Variante single-tenant (instalador por sede): --tenant <slug> [--out ruta.json]
node scripts/gen-n8n-workflow.mjs --tenant dtcvillatranquila
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
Promotor → elige programa (catálogo según la vertical de la ONG)
  → registra beneficiario → graba WAV (WebAudio 16kHz) → IndexedDB (pending)
  → Service Worker Background Sync → POST /api/audio
  → SQLite: RECIBIDO + fire-and-forget webhook → n8n
  → n8n: whisper (transcripción) → ollama (extracción JSON) → POST /extraccion → POST /generar-docx
  → SQLite: LISTO → promotor revisa/edita en /informe/[id] (cada edición regenera el .docx)
  → "Enviar a coordinación" (POST /enviar → enviado=1) → aparece en /informes para el equipo
```

El estado se fusiona entre cliente (IndexedDB) y servidor (SQLite). Ver ARCHITECTURE.md para el diagrama completo.

Un flag **`enviado`** separa borrador (del promotor) de "en coordinación": un `LISTO` no aparece en `/informes` hasta `POST /enviar`. Una vez enviado, solo el rol **admin** puede editar (`PATCH /editar`) o borrar (`DELETE /api/admin/informe/[id]`).

El `tenant` lo decide el servidor por el header `Host` (no el cliente) y selecciona la **vertical** de la ONG: catálogo de programas, fusión de `datos`, armado del `.docx` y, en n8n, el system prompt y el JSON Schema de extracción. El `programa` viaja en la meta del upload y orienta el énfasis del prompt dentro de esa vertical. Ver "Verticales por ONG".

### Estructura de `app-pwa/src/`

- **`app/`** — Rutas Next.js App Router
  - `api/audio/` — recibe el WAV, escribe SQLite, dispara n8n
  - `api/informe/[id]/` — callbacks de n8n sin auth (`extraccion`, `generar-docx`, `error`, `docx`) + acciones con auth (`campos`, `editar`, `enviar`, `reprocesar`, `subir-r2`, `podio`)
  - `api/admin/informe/[id]/` — DELETE de coordinación; exige rol admin (`x-role`)
  - `registrar/` (elige programa) → `registrar/beneficiario/` → `grabar/`, `estado/[id]/`, `informe/[id]/` (+ `informe/[id]/preview`), `registros/` (mis registros) e `informes/` (informes del equipo / coordinación) — páginas del flujo
  - `flow-context.tsx` — contexto del flujo de captura (programa, tipo, beneficiario) persistido en `sessionStorage`
- **`lib/reports/`** — pipeline de generación de informes
  - `schema.ts` — envelope común: `FieldReport`, `ReportExtraction` (con `datos: unknown`), `ReportMetadata`, `Programa` (union de TODAS las verticales), `DatosInforme` + `EXTRACTION_JSON_SCHEMA` (los de Pequeños Pasos / default)
  - `verticals/` — **una vertical por ONG** (config de dominio). `types.ts` (interfaz `Vertical`), `index.ts` (`verticalForTenant()` + dispatcher `buildReportContent()`), `pequenospasos.ts`, `dtc.ts`. Cada vertical define `programas`, `mergeDatos()`, `buildContent()`, `orgName` (y la DTC sus tipos `DtcDatos` + `DTC_EXTRACTION_SCHEMA`).
  - `build.ts` — `buildReport()`: ensambla el `FieldReport` (envelope común) y delega la fusión de `datos` a la vertical del tenant; limpia placeholders de modelos chicos
  - `assemble.ts` — system prompts de Pequeños Pasos (`SYSTEM_PROMPT` + variantes), `systemPromptForPrograma()`, `buildUserMessage()`. **Fuente de verdad de los prompts PP** que espeja `gen-n8n-workflow.mjs` (el runtime real es n8n)
  - `content.ts` — tipos `ReportContent`/`Section` (con `id` por sección) + helpers compartidos + `buildPpReportContent()` (cuerpo de Pequeños Pasos); `reportFileBase()`, `beneficiarioFolder()`
  - `campos.ts` — `filterReportContent()` (filtra por `Section.id`), `defaultCamposForTenant()`
  - `report-docx.ts` — `renderReportDocxBufferFromContent()`: genera el `.docx` (genérico, desde `ReportContent.sections`)
  - `generar-docx.ts` — orquesta content (dispatcher) → filter → render
- **`lib/api/`** — helpers de las API routes (`metadata.ts`: `parseUploadMeta`/`toReportMetadata`; `validate.ts`: `assertValidId` UUID-v4 anti path-traversal)
- **`lib/queue/`** — IndexedDB del cliente (`db.ts`, `enqueue.ts`)
- **`lib/db/`** — SQLite del servidor (`sqlite.ts`: tabla `informes`, incluye columnas `enviado`/`enviado_at`; `paths.ts`)
- **`lib/tenants/`** — multi-tenant Edge-safe (`config.ts`: resolución por Host, passwords, rol admin, landing apex)
- **`middleware.ts`** — resuelve tenant por `Host`, Basic Auth e inyecta `x-tenant`/`x-role`; excluye del auth solo los callbacks de n8n
- **`components/`** — componentes UI reutilizables (`main-nav.tsx`: navbar de 3 tabs Registrar / Mis registros / Informes; `status-chip.tsx`: chips de estado y prioridad)

### Verticales por ONG

Una **vertical** (`lib/reports/verticals/<slug>.ts`) es la configuración de dominio de una ONG. El tenant (Host) la selecciona vía `verticalForTenant()`. Define:

- `programas` — catálogo que se ofrece en `/registrar` (lo arma el server por tenant).
- `mergeDatos()` — fusiona la extracción del LLM sobre la forma de `datos` propia de la vertical.
- `buildContent()` — arma el `ReportContent` (encabezado + secciones del `.docx`).
- `orgName` — nombre de la ONG en el documento.

El envelope (`resumen`, `prioridad`, `entidades`, `accionesPendientes`) es **común**; solo `datos` y las secciones del documento cambian por vertical. Por eso `FieldReport.datos` es `unknown` y cada vertical castea a su tipo. Verticales actuales: `pequenospasos` (default; nutrición/niñez/oficios) y `dtcvillatranquila` (DTC modelo SEDRONAR; programas `hpc`/`seguimiento`/`taller`).

El **system prompt y el JSON Schema NO viven en la vertical**: los consume solo n8n. La fuente de verdad de los prompts está en `assemble.ts` (Pequeños Pasos) y en `gen-n8n-workflow.mjs` (DTC); los schemas en `schema.ts` (PP) y `verticals/dtc.ts` (DTC).

### n8n workflow

`n8n/workflows/registro.json` es **generado automáticamente** por `scripts/gen-n8n-workflow.mjs`. **No editar a mano.** El flujo es **uno solo y adaptativo**: el nodo `preparar-prompt` elige el system prompt y el schema en runtime según `meta.tenant`/`meta.programa`.

- **Modo global** (default): `node scripts/gen-n8n-workflow.mjs` → workflow `EstoyAi — registro de voz a informe` (id `estoyairegistro`) que lleva los prompts/schemas de **todas** las ONGs.
- **Modo single-tenant**: `node scripts/gen-n8n-workflow.mjs --tenant <slug> [--out ruta.json]` → workflow con SOLO esa ONG (para compilar un instalador por sede; id `<slug>registro`, nombre `<OrgName> — registro`).

Selección de prompt: `PROMPTS["<tenant>:<programa>"]` → `PROMPTS["<programa>"]` → `PROMPTS.generic`. Selección de schema: `SCHEMAS[meta.tenant]` → `SCHEMAS.default`. Modelo: `$env.OLLAMA_MODEL`.

Al cambiar prompts o schema de una ONG, actualizá su fuente de verdad **y** la copia en `gen-n8n-workflow.mjs`, regenerá y reimportá (`scripts/update-workflow.bat` / `.mjs`, o n8n → Import from file). El workflow `subir-r2.json` (Cloudflare R2) se genera con `scripts/gen-subir-r2.mjs`.

### Invariantes críticos

- **El UUID nace en el dispositivo** (`enqueueRegistro()`), es la clave primaria en IndexedDB, SQLite y filesystem (`data/audio/<id>.wav`, `data/docx/<id>.docx`). Las API routes validan que sea UUID-v4 (`assertValidId`).
- **n8n nunca escribe SQLite**. Solo llama endpoints HTTP de `app-pwa`.
- **El LLM nunca inventa datos**. Campos vacíos → `""` o `[]`. El JSON Schema grammar lo fuerza; `buildReport()` además limpia placeholders ("[No especificada]", "N/A", …) que los modelos chicos emiten pese al prompt.
- **El `tenant` lo decide el servidor por `Host`** (middleware → `x-tenant`), nunca el cliente. El tenant selecciona la **vertical** (prompts, schema, `datos`, `.docx`); el `programa` orienta el énfasis dentro de la vertical.
- **WAV 16kHz via WebAudio**, no MediaRecorder/WebM (produce artefactos que degradan la transcripción).
- **`buildReportContent()` es un dispatcher** (`verticals/index.ts`) que delega en la vertical del tenant. Cada `buildContent()` siempre emite el encabezado + sus secciones; valores vacíos → `"—"`, listas vacías → `["—"]`.

---

## Variables de entorno relevantes

Ver `.env.example`. Las más importantes al desarrollar:

| Variable                            | Efecto                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `DATA_DIR`                          | Directorio de audio, docx y sqlite (default: `../data`)                      |
| `N8N_WEBHOOK_URL`                   | URL del webhook n8n (default: `http://n8n:5678/webhook/registro`)            |
| `OLLAMA_MODEL`                      | Modelo LLM (default: `gemma3:4b`; alternativa lenta: `qwen3:1.7b`)           |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE`      | Debe ser `false` para que n8n lea env vars en Code nodes                     |
| `TENANT_<SLUG>_PASSWORD`            | Contraseña Basic Auth de esa ONG (fallback `SITE_PASSWORD`). Ej: `TENANT_DTCVILLATRANQUILA_PASSWORD` |
| `TENANT_<SLUG>_ADMIN_PASSWORD`      | Contraseña admin de esa ONG (habilita editar/borrar en coordinación)         |

---

## Referencia de arquitectura

Ver `ARCHITECTURE.md` para: diagrama de componentes, flujo de datos, máquinas de estado cliente/servidor, modelo de dominio y decisiones técnicas.

Ver `DESIGN-SYSTEM.md` para el design system UI (tokens, tipografía, motion).
