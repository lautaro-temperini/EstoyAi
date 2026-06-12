# landing-site — apex estoyai.com (always-on)

Export **estático** de la landing pública, servido por **Cloudflare Pages**.
Desacopla el apex de la sede: `estoyai.com` está siempre online aunque la PC de
la sede (Rancher/Docker) esté apagada.

## Por qué existe

| Host | Sirve | Depende de |
|---|---|---|
| `estoyai.com` / `www` | esta landing (Cloudflare Pages) | nada — siempre online |
| `<ong>.estoyai.com` (ej. `pequenospasos`) | `app-pwa` vía Cloudflare Tunnel | Rancher levantado en la sede de esa ONG |

El tunnel rutea **solo** los subdominios de institución a `localhost:3000`.
El apex/www apuntan (CNAME, proxied) a `estoyai-landing.pages.dev`.

## Único source of truth

No duplica la landing. Reusa los archivos de
`app-pwa/src/app/landing/` vía el alias `@landing/*` (ver `tsconfig.json`):

- `app/page.tsx` → re-export de `@landing/page`.
- `app/layout.tsx` → root layout standalone (html/body + wrapper `.landing`),
  reusa `metadata` y `landing.css` de la landing.

Para cambiar la landing, editá `app-pwa/src/app/landing/` y volvé a deployar acá.
Los assets (`public/icono.ico`, `favicon.ico`, `icon.svg`) son copia de
`app-pwa/public/` — si cambian allá, recopiarlos.

## Deploy

```bash
cd landing-site
npm install
npm run build          # genera out/ (estático)
npx wrangler login     # una vez (OAuth)
npx wrangler pages deploy out --project-name=estoyai-landing --branch=main
```

O en un comando: `npm run deploy`.

`public/_redirects` mapea `/landing → /` (la URL canónica del apex es `/`).
