# Multi-tenant, Tunnel y R2

Una sola app (`app-pwa`, puerto 3000) sirve varias ONGs por subdominio:

```
pequenospasos.estoyai.com → tenant "pequenospasos"
otraong.estoyai.com       → tenant "otraong"
estoyai.com / www / local → tenant default (primero de TENANTS)
```

El subdominio (Host header) decide: **login** (contraseña propia), **branding**
(título/nombre) y **system prompt** (vía metadata → n8n).

---

## 1. Cloudflare Tunnel

El servicio ya se instala con:

```powershell
cloudflared.exe service install <TOKEN>
```

> ⚠️ El token compartido en chat quedó expuesto. Rotalo: Zero Trust → Networks →
> Tunnels → tu tunnel → **Refresh token**, y reinstalá el servicio con el nuevo.

El tunnel es *remotely-managed* (token), así que el ruteo se define en el
dashboard, **no** en un `config.yml` local:

**Zero Trust → Networks → Tunnels → (tu tunnel) → Public Hostname → Add a public hostname**

| Subdomain       | Domain      | Type | URL                     |
| --------------- | ----------- | ---- | ----------------------- |
| *(vacío)*       | estoyai.com | HTTP | `http://localhost:3000` |
| `www`           | estoyai.com | HTTP | `http://localhost:3000` |
| `pequenospasos` | estoyai.com | HTTP | `http://localhost:3000` |

Todas apuntan al mismo `localhost:3000`. Cloudflare crea el registro DNS solo.
Por cada ONG nueva: una fila más con su subdominio.

---

## 2. Agregar una ONG

1. **Código** — `app-pwa/src/lib/tenants/config.ts`, sumá a `TENANTS`:
   
   ```ts
   { slug: "otraong", orgName: "Otra ONG", shortName: "Otra ONG" },
   ```
2. **Contraseña** — en `.env`:
   
   ```
   TENANT_OTRAONG_PASSWORD=una-clave-fuerte
   ```
   
   (Variable: `TENANT_<SLUG_EN_MAYÚSCULAS>_PASSWORD`. Sin ella cae a `SITE_PASSWORD`.)
3. **Tunnel** — Public Hostname `otraong.estoyai.com → http://localhost:3000`.
4. **System prompt propio (opcional)** — en `scripts/gen-n8n-workflow.mjs`,
   dentro de `PROMPTS`, agregá claves `"otraong:<programa>"`:
   
   ```js
   "otraong:primera-infancia": buildSystemPrompt([ "CONTEXTO…", "…" ]),
   ```
   
   Luego regenerá e reimportá el workflow:
   
   ```bash
   node scripts/gen-n8n-workflow.mjs
   # n8n → Workflows → Import from file → n8n/workflows/registro.json
   ```
   
   Sin claves propias, la ONG usa los prompts por programa (compat).
5. **Rebuild** del contenedor app-pwa: `docker compose up -d --build app-pwa`.

La selección de prompt en n8n prueba en orden:
`"<tenant>:<programa>"` → `"<programa>"` → `"generic"`.

---

## 3. Cloudflare R2

Estado actual:

- **App** (`/api/informe/[id]/subir-r2`) — ✅ listo. Arma el payload
  (`id`, `filename`, `carpeta`, `subcarpeta`) y lo POSTea a `N8N_R2_WEBHOOK_URL`.
- **n8n** — ✅ workflow generado en `n8n/workflows/subir-r2.json`. Falta
  importarlo, completar `.env` y reiniciar.

**Todo vía `.env`** — sin credencial de n8n. El workflow firma S3 (SigV4) a mano
en un Code node leyendo las envs. Rotar = cambiar `.env` + `docker compose up -d`.

### Pasos

1. **Bucket** — dash.cloudflare.com → R2 → Create bucket (ej. `estoyai-informes`).
2. **Token** — R2 → Manage R2 API Tokens → Create → *Object Read & Write*.
   Anotá Account ID, Access Key ID y Secret.
3. **`.env`** (los 4 valores van acá):
   
   ```
   CF_ACCOUNT_ID=<id de cuenta>
   CF_R2_ACCESS_KEY_ID=<access key>
   CF_R2_SECRET_ACCESS_KEY=<secret>
   CF_R2_BUCKET=estoyai-informes
   N8N_R2_WEBHOOK_URL=http://n8n:5678/webhook/subir-r2
   ```
4. **Importar el workflow** — ya armado en
   [`n8n/workflows/subir-r2.json`](n8n/workflows/subir-r2.json):
   n8n → Workflows → Import from file → seleccioná el archivo → **Activá**.
   (Sin elegir credenciales: lee todo de `$env`.)
5. **Reiniciar** para cargar las envs nuevas: `docker compose up -d`.

> Si editás la firma, regenerá el workflow: `node scripts/gen-subir-r2.mjs`.
> Requiere `NODE_FUNCTION_ALLOW_BUILTIN=crypto,http,https` en el servicio n8n (ya está en
> docker-compose) para que el Code node pueda `require('crypto')`.

### Cómo funciona

```
Webhook POST /webhook/subir-r2  (recibe {id, filename, carpeta, subcarpeta})
  → Code node "subir-r2":
       1. baja el .docx: GET http://app-pwa:3000/api/informe/<id>/docx
       2. firma SigV4 (s3 / region auto / path-style) con las envs CF_R2_*
       3. PUT a https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<carpeta>/<subcarpeta>/<filename>
```

n8n **no** monta el volumen `data`, por eso baja el `.docx` por HTTP de `app-pwa`
(endpoint ya excluido de Basic Auth) en vez de leerlo del disco. Sin
`N8N_R2_WEBHOOK_URL` el botón responde 501 ("no configurado").

> La firma SigV4 está verificada contra los vectores de prueba oficiales de AWS.
> Lo no testeado es el runtime de n8n (`require('crypto')`, `this.helpers.httpRequest`
> con binario). Si la primera subida falla, mandame el error del execution y lo ajusto.
