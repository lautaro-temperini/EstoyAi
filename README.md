# EstoyAi

> La ONG hace el trabajo. EstoyAi lo deja escrito.

PWA offline-first para promotores de campo: graban un mensaje de voz al salir del domicilio, el audio viaja a la sede de la organización, y en menos de 5 minutos hay un informe Word (.docx) listo para archivar. La transcripción, el procesamiento con IA y el almacenamiento corren localmente — ningún audio ni dato sale a servidores externos.

**Gratis · Código abierto · Sin conexión en campo · IA local**

---

## El problema

Las ONGs que trabajan en territorio acumulan evidencia en cuadernos, grupos de WhatsApp y planillas de Excel. Cada paso entre ellos es una transcripción a mano. Cuando un financiador pide evidencia, el equipo reconstruye el año entero desde cero. 13 de 16 organizaciones entrevistadas en Halketon (jun 2026) enfrentaban este patrón.

## Cómo funciona

```
Promotor dicta 2 min en el celular (sin señal está bien)
  → audio se encola en IndexedDB
  → sube a la sede cuando hay red
  → Whisper transcribe → Ollama extrae campos → se genera el .docx
  → promotor descarga el informe desde su celular
```

Todo corre en la PC de la sede. Sin APIs externas, sin suscripciones, sin GPU requerida.

## Por qué es diferente

|                  | EstoyAi                                 |
| ---------------- | --------------------------------------- |
| **Costo**        | Gratis, sin licencias                   |
| **Datos**        | Quedan en la sede de la ONG             |
| **Conectividad** | Funciona sin señal en campo             |
| **Hardware**     | PC con 8GB RAM (donación típica de ONG) |
| **IA**           | Local: Whisper + Ollama (gemma3:4b)     |
| **Multi-ONG**    | Multi-tenant por subdominio             |

## Estructura

```
app-pwa/           Next.js 15 PWA + API REST + SQLite
services/whisper/  Transcripción (faster-whisper)
n8n/workflows/     Orquestación del pipeline audio → docx
scripts/           Generador de workflow, diagnóstico
cloudflared/       Config del túnel Cloudflare (referencia)
landing-site/      Landing pública (estoyai.com)
```

## Desarrollo local

```bash
cd app-pwa && npm install && npm run dev
```

Abrir `http://localhost:3000` → elegir programa → registrar beneficiario → grabar.  
Sin Docker, sin transcripción real. Útil para iterar sobre la UI.

## Sede (stack completo)

Requiere [Rancher Desktop](https://rancherdesktop.io/) o Docker Desktop.

```bash
docker compose up -d
docker compose exec ollama ollama pull gemma3:4b
```

El instalador para Windows (genera un `.exe` con todo incluido) está en `PequenosPasos/` — no se versiona porque incluye credenciales de la sede.

Variables de entorno: copiar `.env.example` → `.env`.

## Documentación

|                                    |                                                                       |
| ---------------------------------- | --------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura completa, flujo de datos, estados, dominio e invariantes |
| [DESIGN.md](DESIGN.md)             | Design system UI — tokens, tipografía, motion                         |
| [MULTITENANT.md](MULTITENANT.md)   | Multi-tenant por subdominio y túnel Cloudflare                        |
| [COMANDOS.md](COMANDOS.md)         | Referencia de todos los comandos del proyecto                         |

## Licencia

MIT — ver [LICENSE](LICENSE).
