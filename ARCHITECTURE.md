# ARCHITECTURE.md — EstoyAi / Pequeños Pasos

Documento único de arquitectura y diseño del sistema: topología, flujo de datos, estados, dominio e invariantes. Para operación diaria ver [CLAUDE.md](CLAUDE.md) y [README-SEDE.md](README-SEDE.md). Para tokens UI ver [DESIGN.md](DESIGN.md).

---

## Propósito del sistema

Herramienta de campo para promotores de una ONG. El promotor llena nombre/apellido/DNI de un beneficiario, graba un mensaje de voz dictando lo que observó en la intervención, y recibe un `.docx` listo para archivar. Todo funciona sin conexión; la sincronización ocurre en segundo plano cuando hay red.

---

## Visión general

EstoyAi es un sistema **offline-first** en dos capas:

| Capa | Dónde corre | Rol |
|---|---|---|
| **Cliente** | Navegador del promotor (PWA) | Captura audio, cola offline, UI |
| **Sede** | PC de la ONG (Docker) | ASR, LLM, persistencia, generación docx |

Una sola instalación de sede puede servir **varias ONGs** vía subdominios ([MULTITENANT.md](MULTITENANT.md)).

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

## Componentes y responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│  Dispositivo del promotor                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PWA (Next.js 15)   :3000                           │   │
│  │  ├─ /registro       captura nombre/apellido/dni     │   │
│  │  ├─ /grabar         graba WAV (WebAudio, 16 kHz)    │   │
│  │  ├─ /estado/[id]    polling del progreso            │   │
│  │  └─ /informe/[id]   descarga .docx / toggle campos  │   │
│  │                                                     │   │
│  │  Service Worker (sw.js)                             │   │
│  │  ├─ Background Sync → POST /api/audio               │   │
│  │  └─ postMessage → actualiza estado cliente          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ POST /api/audio (multipart)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Docker stack  (red interna: sede-net)                      │
│                                                             │
│  app-pwa :3000  ──webhook──▶  n8n :5678                    │
│     │                           │                           │
│     │ SQLite (data/sqlite/)      ├──▶ whisper :8000         │
│     │ audio  (data/audio/)       │    faster-whisper medium │
│     │ docx   (data/docx/)        │                          │
│     │                           ├──▶ ollama :11434          │
│     │◀── POST /extraccion        │    gemma3:4b              │
│     │◀── POST /generar-docx      │                          │
│     │◀── POST /error             └──▶ POST /api/informe/…   │
│                                                             │
│  Volúmenes compartidos: data (app-pwa + whisper)           │
└─────────────────────────────────────────────────────────────┘
```

### Servicios Docker

| Servicio | Imagen / Framework | Rol |
|---|---|---|
| `app-pwa` | Next.js 15, `output: standalone` | PWA + API REST + SQLite |
| `n8n` | n8nio/n8n 2.8.4 | Orquestador del pipeline (no escribe SQLite) |
| `whisper` | faster-whisper `medium` | Transcripción ASR, POST /transcribe |
| `ollama` | ollama 0.30.5, `gemma3:4b` | LLM local, extracción estructurada |

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

## Flujo de datos end-to-end

```
[Promotor]
  1. /registro  → ingresa nombre/apellido/DNI (sessionStorage)
  2. /grabar    → graba WAV (WebAudio ScriptProcessorNode, 16 kHz mono PCM)
                → enqueueRegistro(): UUID generado en dispositivo
                  WAV + meta guardados en IndexedDB (pending store)
                → navega a /estado/<id>

[Service Worker]
  3. Background Sync → POST /api/audio (multipart)
     - campo: audio = WAV blob
     - campo: meta  = JSON {id, tipo, beneficiario, capturedAt, …}
     - postMessage al cliente: encolado → subiendo

[POST /api/audio]
  4. Guarda WAV en data/audio/<id>.wav
     Escribe SQLite: RECIBIDO
     Fire-and-forget → n8n webhook

[n8n — registro.json]
  5a. POST /transcribe → faster-whisper → transcripcion: string
  5b. Ollama gemma3:4b con SYSTEM_PROMPT + EXTRACTION_JSON_SCHEMA (grammar)
      → ReportExtraction (JSON constrained)
  5c. POST /api/informe/<id>/extraccion  → SQLite: EXTRAIDO
  5d. POST /api/informe/<id>/generar-docx → renderiza .docx → SQLite: LISTO
  5e. (rama error) POST /api/informe/<id>/error → SQLite: ERROR

[/estado/<id>]
  6. Polling GET /api/informe/<id> cada 4 s
     SW postMessage: subiendo → procesando
     polling: procesando → listo / error

[Promotor]
  7. Descarga GET /api/informe/<id>/docx
     Nombre del archivo: Apellido_Nombre_DNI_YYYY-MM-DD.docx
```

---

## Máquinas de estado

### Cliente (IndexedDB `registros`, `RegistroEstado`)

```
encolado
  │  (SW detecta red o SW inicia Background Sync)
  ▼
subiendo
  │  (SW confirma upload completo)
  ▼
procesando   ◀── polling GET /api/informe
  │
  ├──▶ listo
  └──▶ error  (retry → reset a encolado)
```

### Servidor (SQLite `informes`, `InformeEstado`)

```
RECIBIDO  (POST /api/audio)
  │
  ├──▶ EXTRAIDO  (POST /extraccion — n8n tras Ollama)
  │       │
  │       └──▶ LISTO   (POST /generar-docx — n8n tras render)
  │
  └──▶ ERROR    (POST /error — rama de error n8n)
```

`/estado/[id]` fusiona ambas: SW postMessage conduce `encolado→subiendo`, el polling del servidor conduce `procesando→listo/error`.

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

## Modelo de dominio

### Tipos principales (`lib/reports/schema.ts`)

```
FieldReport
  ├─ id: string (UUID — generado en dispositivo, viaja a través de todo el pipeline)
  ├─ transcripcion: string (verbatim — fuente de verdad, no se modifica)
  ├─ metadatos: ReportMetadata
  │    ├─ tipo: "individual" | "grupal"
  │    ├─ beneficiario: { nombre, apellido, dni } | null
  │    ├─ sector, unidad: string | null
  │    └─ capturedAt, durationMs
  ├─ estado: "PENDIENTE" | "CONFIRMADO"
  ├─ createdAt: number (epoch ms, servidor)
  └─ [ReportExtraction]
       ├─ resumen: string (1-2 frases ejecutivas)
       ├─ prioridad: "ALTA" | "MEDIA" | "BAJA"
       ├─ entidades: { nombres[], fechas[] }
       ├─ accionesPendientes: string[]
       └─ datos: DatosInforme
            ├─ demografia  (nombre, edad, fechaNacimiento, esMenor)
            ├─ metricas    (peso, talla, diagnosticos[], avanceObra)
            ├─ socioeconomico (familia, ingresos, vivienda, vulnerabilidades[])
            ├─ intervencion  (fecha, lugar, tipoActividad, profesionales[])
            ├─ seguimiento   (compromisos[], situacionLaboral, desempenoAcademico)
            └─ narrativa: string
```

### Invariantes críticos

- **El LLM nunca inventa datos.** Todo campo vacío → `""` o `[]`. El `SYSTEM_PROMPT` lo explicita y el JSON Schema grammar lo fuerza.
- **`transcripcion` es inmutable.** El LLM solo organiza; la transcripción original siempre está disponible para verificación.
- **El UUID nace en el dispositivo.** Se genera en `enqueueRegistro()` y es la clave primaria en IndexedDB, SQLite y el filesystem (`data/audio/<id>.wav`, `data/docx/<id>.docx`).
- **n8n nunca escribe SQLite.** Solo llama endpoints HTTP de Next.js, que son el único escritor.

---

## Pipeline de LLM

### Prompt del sistema (`assemble.ts → SYSTEM_PROMPT`)

Instrucciones en español para el modelo:
1. Extraer exclusivamente lo que dice la transcripción.
2. Si es mensaje de prueba o sin información real → decirlo en el resumen y dejar todo vacío.
3. Reglas campo por campo con definiciones precisas.
4. Regla crítica para arrays: si no se menciona explícitamente → `[]`.
5. `/no_think` al final para suprimir razonamiento interno (Qwen/Gemma compatible).

### Prompt de usuario (`buildUserMessage`)

```
Fecha del registro: <día largo en español, ej. "martes, 6 de junio de 2026">.

Transcripción:
<texto verbatim de faster-whisper>
```

La fecha se ancla en español para que el modelo resuelva referencias relativas ("hoy", "el martes") a fechas absolutas.

### JSON Schema (`EXTRACTION_JSON_SCHEMA`)

Pasado como `format` a Ollama (grammar-constrained). Fuerza:
- `prioridad` a enum `["ALTA","MEDIA","BAJA"]`
- Todos los campos requeridos presentes
- `additionalProperties: false` en cada objeto

El modelo no puede emitir JSON malformado ni agregar campos no definidos.

---

## Generación del informe `.docx`

### Pipeline de render

```
FieldReport
  │
  ▼ buildReportContent()   [content.ts]
ReportContent
  ├─ disclaimer
  ├─ titular (Apellido Nombre, o fallback a LLM → "Actividad Grupal")
  ├─ prioridad
  ├─ fecha, lugar
  ├─ resumenEjecutivo
  └─ sections: Section[]
       ├─ { kind: "fields", title, fields: [{label, value}] }
       ├─ { kind: "bullets", title, items: string[] }
       └─ { kind: "text", title, body }
  │
  ▼ filterReportContent()  [campos.ts]  ← opcional, si el promotor oculta secciones
  │
  ▼ renderReportDocxBufferFromContent()  [report-docx.ts]
Buffer (.docx)
```

### Invariante de secciones

`buildReportContent()` **siempre** emite las 11 secciones. Ningún campo queda en blanco: si el valor es vacío → `"—"`, si el array es vacío → `["—"]`. Esto garantiza que el `.docx` tenga estructura consistente independientemente de qué mencionó el promotor.

### Nombre del archivo

```
Apellido_Nombre_DNI_YYYY-MM-DD.docx
```

Normalizado: sin acentos, espacios → `_`. Si falta algún dato → `informe-<uuid>.docx`.

---

## Offline / PWA

- **IndexedDB `pending` store**: cola de uploads. Cada entrada tiene WAV + meta + estado.
- **IndexedDB `registros` store**: lista persistente visible en la app (historial del dispositivo).
- **Service Worker (`public/sw.js`)**: intercepta `POST /api/audio` mientras hay red. Si la app está cerrada, Background Sync reintenta al reconectar.
- **WAV, no WebM**: `use-recorder.ts` usa `WebAudio ScriptProcessorNode` para codificar PCM WAV 16 kHz mono. MediaRecorder produce WebM que genera transcripciones defectuosas en faster-whisper.

---

## n8n workflow

`n8n/workflows/registro.json` es **generado**. No editar a mano. La fuente es `scripts/gen-n8n-workflow.mjs`, que embebe copias literales de `SYSTEM_PROMPT` y `EXTRACTION_JSON_SCHEMA`.

Al cambiar el prompt o el schema:
1. Editar `lib/reports/assemble.ts` y/o `lib/reports/schema.ts`.
2. Actualizar las copias en `scripts/gen-n8n-workflow.mjs`.
3. `node scripts/gen-n8n-workflow.mjs`
4. Reimportar en el editor n8n y reactivar el workflow.

O en sede: `scripts/update-workflow.bat`.

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

## Variables de entorno clave

| Variable | Dónde se usa | Default |
|---|---|---|
| `DATA_DIR` | app-pwa, whisper | `../data` (relativo a `app-pwa/`) |
| `N8N_WEBHOOK_URL` | `POST /api/audio` | `http://n8n:5678/webhook/registro` |
| `OLLAMA_MODEL` | n8n Code node (`$env.OLLAMA_MODEL`) | `gemma3:4b` |
| `NEXT_PUBLIC_ASR_LANG` | assemble.ts `ASR_LANGUAGE` | `es` |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | n8n | debe ser `false` |
| `WHISPER_MODEL` | whisper Dockerfile build arg | `base` (runtime: `medium`) |

Lista completa: `.env.example`.

---

## Decisiones de arquitectura

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| UUID generado en dispositivo | UUID en servidor | El id debe viajar con el WAV offline; no se puede esperar al servidor |
| better-sqlite3 síncrono | Postgres, SQLite async | Stack de un promotor en sede; un solo escritor; zero-config |
| WAV 16 kHz via WebAudio | MediaRecorder WebM | WebM produce artefactos que degrada dramáticamente la transcripción |
| n8n como orquestador | Cola interna en Next.js | Visualización de ejecuciones, reintentos, branching sin código custom |
| JSON Schema grammar (Ollama `format`) | Post-processing del output | Modelo pequeño (4b) no garantiza JSON válido sin grammar |
| Next.js como único escritor SQLite | n8n escribe directo | Única fuente de verdad; evita race conditions entre procesos |
| `output: standalone` | Export estático | Necesita API routes (SQLite, archivos) |

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
| [DESIGN.md](DESIGN.md) | Design system UI (tokens, componentes) |
| [CLAUDE.md](CLAUDE.md) | Comandos y guía para agentes de código |
| [README-SEDE.md](README-SEDE.md) | Manual operativo para coordinadores |
| [MULTITENANT.md](MULTITENANT.md) | Subdominios, tunnel, R2 |
| [docs/brief.md](docs/brief.md) | Brief de producto (local) |
| [docs/prd.md](docs/prd.md) | Requisitos de producto (local) |
| [docs/trd.md](docs/trd.md) | Requisitos técnicos (local) |
