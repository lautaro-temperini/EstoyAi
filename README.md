# Pequeños Pasos — Registro de campo por voz

PWA para promotores de ONG: graban un mensaje de voz en el teléfono, el audio viaja a la sede, y se genera un informe editable (.docx).

## Estructura

```
app-pwa/           Next.js PWA + API
services/whisper/  Transcripción (faster-whisper)
n8n/workflows/     Orquestación sede
data/              Volúmenes locales (audio, docx, sqlite)
```

## Desarrollo local

```bash
cd app-pwa && npm install
npm run dev          # desde la raíz, o: cd app-pwa && npm run dev
```

Abrir http://localhost:3000 → elegir tipo → registro → grabar.

Variables de entorno: ver `.env.example`.

## Licencia

Ver `LICENSE`.
