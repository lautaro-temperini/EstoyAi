# Seguridad — EstoyAi

EstoyAi maneja datos personales sensibles de beneficiarios (incluidos menores).
Este documento describe el modelo de amenaza, los controles implementados y la
configuración obligatoria en producción.

## Modelo de amenaza

- **Despliegue**: una PC en la sede de la ONG, expuesta a internet por Cloudflare
  Tunnel. Solo se publica el puerto **3000** (la PWA). n8n (5678), whisper y
  ollama son internos a la red Docker `sede-net` y **no deben** exponerse por el
  túnel.
- **Actores**: promotores autenticados (rol `user`), coordinación (rol `admin`),
  y atacantes anónimos que alcanzan la URL pública.
- **Activos**: audios, transcripciones y `.docx` con datos de familias y menores;
  la base SQLite; los secretos de integraciones (R2, Podio).

## Controles implementados

| Riesgo | Control | Dónde |
| --- | --- | --- |
| Acceso anónimo a la app | HTTP Basic Auth por tenant | `middleware.ts` |
| Fuerza bruta de contraseña | Rate-limit en memoria por IP (30 fallos / 5 min → 429) | `middleware.ts` |
| Timing attack sobre la contraseña | Comparación en tiempo constante | `lib/api/internal-auth.ts` |
| IDOR cross-tenant (ver/editar informes de otra ONG) | Check `metadata.tenant === x-tenant` en toda ruta `[id]` | `lib/api/tenant-guard.ts` |
| Callbacks de n8n abiertos | Secreto compartido `X-Internal-Token` | `lib/api/internal-auth.ts` |
| Descarga de `.docx` sin auth | El `docx` GET pasa por Basic Auth + check de tenant | `middleware.ts`, `docx/route.ts` |
| Path traversal por `id` | `assertValidId` exige UUID v4 estricto | `lib/api/validate.ts` |
| Header injection en `Content-Disposition` | Sanitización del filename + `filename*` RFC 5987 | `docx/route.ts` |
| Datos basura del LLM | Limpieza de placeholders + coerción de tipos/enum | `lib/reports/build.ts` |
| Clickjacking / sniffing / etc. | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | `next.config.ts` |

## Configuración obligatoria en producción

En el `.env` de la sede (ver `.env.example`):

- `SITE_PASSWORD` o `TENANT_<SLUG>_PASSWORD` — **obligatorio**. Vacío = sin auth
  (solo desarrollo).
- `TENANT_<SLUG>_ADMIN_PASSWORD` — habilita editar/borrar en coordinación.
- `N8N_CALLBACK_SECRET` — protege los callbacks internos. **Se genera solo**:
  `primera-vez.bat` crea un valor aleatorio de 64 hex y lo escribe en `.env`
  (y hace backfill si el `.env` ya existía). La sede no lo toca. El workflow que
  trae el instalador ya manda el header `X-Internal-Token` leyendo esa env. Solo
  en builds manuales hay que setearlo a mano y regenerar el workflow
  (`node scripts/gen-n8n-workflow.mjs`).

## Backup

**El backup es responsabilidad exclusiva de cada sede.** EstoyAi no realiza
copias automáticas. La pérdida de datos por falta de backup no es
responsabilidad del proveedor del software.

Recomendación mínima:
- Backup semanal a disco externo (puede ser cifrado con BitLocker si la sede
  maneja riesgo alto de robo — ver "Cifrado en reposo").
- Verificar periódicamente que el backup sea legible.
- No usar nubes públicas gratuitas para datos sensibles de beneficiarios
  sin revisar el marco legal aplicable (Ley 25.326).

Si la sede contrata un servicio de backup en la nube (R2, Drive, S3, etc.),
es su responsabilidad configurarlo y garantizar que cumpla los requisitos de
privacidad para datos personales de menores.

## Cifrado en reposo

SQLite, audios y `.docx` se guardan **sin cifrar** en `DATA_DIR`. Es una decisión
deliberada: en una PC de sede operada por no técnicos, el riesgo de **perder una
clave de cifrado y quedarse sin datos** supera al del robo físico del equipo. La
mitigación del robo es responsabilidad de la institución (resguardo físico del
equipo) y del **backup manual a disco externo** (nunca a la nube) — ver memoria
del proyecto. Si una sede maneja un riesgo de robo alto, puede activar BitLocker
por su cuenta, asumiendo el manejo de la clave de recuperación.

## Túnel Cloudflare

Verificar en el dashboard del túnel que el único Public Hostname apunte a
`http://localhost:3000`. **Nunca** mapear 5678 (n8n) ni los servicios internos.

## Reporte de vulnerabilidades

Escribir a latta.romero@gmail.com. No abrir issues públicos para fallos de
seguridad explotables.
