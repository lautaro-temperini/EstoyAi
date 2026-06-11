# Pequeños Pasos — Registro de campo por voz

PWA para promotores de ONG: graban un mensaje de voz en el teléfono, el audio viaja a la sede, y se genera un informe editable (.docx).

Plataforma **EstoyAi** — multi-tenant por subdominio (`pequenospasos.estoyai.com`, etc.).

## Estructura

```
app-pwa/           Next.js PWA + API
services/whisper/  Transcripción (faster-whisper)
n8n/workflows/     Orquestación sede
scripts/           Generador workflow, arranque sede, diagnóstico
data/              Volúmenes locales (audio, docx, sqlite)
```

## Desarrollo local

```bash
cd app-pwa && npm install
npm run dev          # desde la raíz, o: cd app-pwa && npm run dev
```

Abrir http://localhost:3000 → elegir tipo → registro → grabar.

Variables de entorno: ver `.env.example`.

## Sede (Docker)

Stack completo para producción en la PC de la ONG:

```bash
docker compose up -d
docker compose exec ollama ollama pull gemma3:4b
```

Manual operativo: [README-SEDE.md](README-SEDE.md). Multi-tenant y tunnel: [MULTITENANT.md](MULTITENANT.md).

## Documentación

| Archivo | Descripción |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Topología, stack, fronteras del sistema |
| [DESIGN.md](DESIGN.md) | Flujo de datos, estados, modelo de dominio |
| [CLAUDE.md](CLAUDE.md) | Comandos y guía para agentes de código |

Documentos de producto locales (no versionados): `docs/brief.md`, `docs/prd.md`, `docs/trd.md`.

## Licencia

Ver `LICENSE`.
