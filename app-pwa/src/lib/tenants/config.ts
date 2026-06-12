/**
 * Multi-tenant: una instalación, varias ONGs servidas por subdominio.
 *
 *   pequenospasos.estoyai.com  →  tenant "pequenospasos"
 *   otraong.estoyai.com        →  tenant "otraong"
 *   estoyai.com / www / local  →  DEFAULT_TENANT
 *
 * Cada tenant tiene: nombre visible, contraseña (Basic Auth) y namespace de
 * system prompt. Una sola app, un solo puerto; el subdominio decide todo.
 *
 * Este módulo es PURO (sin imports de Node) para que el middleware (Edge
 * runtime) pueda usarlo. Las contraseñas se leen de env: TENANT_<SLUG>_PASSWORD,
 * con fallback a SITE_PASSWORD (instalación de un solo cliente).
 *
 * Agregar una ONG:
 *   1. Sumá una entrada a TENANTS (slug = subdominio).
 *   2. Definí TENANT_<SLUG>_PASSWORD en .env (slug en MAYÚSCULAS).
 *   3. En el dashboard de Cloudflare Tunnel, agregá el Public Hostname
 *      <slug>.estoyai.com → http://localhost:3000.
 *   4. (Opcional) system prompt propio: agregá las claves "<slug>:<programa>"
 *      en PROMPTS de scripts/gen-n8n-workflow.mjs y regenerá el workflow.
 */

export interface Tenant {
  /** Subdominio y clave primaria del tenant. */
  slug: string;
  /** Nombre visible de la ONG (títulos, realm de auth, branding). */
  orgName: string;
  /** Nombre corto (PWA short_name, encabezados compactos). */
  shortName: string;
}

/** Dominio raíz; configurable para staging/local. */
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "estoyai.com";

/** Catálogo de ONGs. El primero es el DEFAULT (apex, www, localhost). */
export const TENANTS: Tenant[] = [
  {
    slug: "pequenospasos",
    orgName: "Pequeños Pasos",
    shortName: "Pequeños Pasos",
  },
  // Plantilla para la próxima ONG — descomentar y ajustar:
  // {
  //   slug: "otraong",
  //   orgName: "Otra ONG",
  //   shortName: "Otra ONG",
  // },
];

export const DEFAULT_TENANT: Tenant = TENANTS[0];

const BY_SLUG = new Map(TENANTS.map((t) => [t.slug, t]));

/** Quita el puerto y normaliza a minúsculas: "Pequenos.estoyai.com:3000" → host. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0].trim().toLowerCase();
}

/** Extrae el primer label si el host es <label>.<ROOT_DOMAIN>; si no, null. */
function subdomainOf(host: string): string | null {
  if (host === ROOT_DOMAIN) return null; // apex
  const suffix = "." + ROOT_DOMAIN;
  if (!host.endsWith(suffix)) return null; // localhost, IP, dominio ajeno
  const label = host.slice(0, -suffix.length);
  // "www" o labels anidados (a.b.estoyai.com) → tomamos el último label real.
  const first = label.split(".").pop() ?? "";
  if (first === "" || first === "www") return null;
  return first;
}

/** Resuelve el tenant a partir del header Host. Cae a DEFAULT_TENANT. */
export function tenantForHost(host: string | null | undefined): Tenant {
  const sub = subdomainOf(normalizeHost(host));
  if (!sub) return DEFAULT_TENANT;
  return BY_SLUG.get(sub) ?? DEFAULT_TENANT;
}

/**
 * Host de landing pública: el apex (estoyai.com) y www. NO es una ONG —
 * muestra la página institucional, sin login y sin acceso al pipeline.
 * localhost/IP NO son landing: en desarrollo se ve la app directamente.
 */
export function isLandingHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return h === ROOT_DOMAIN || h === "www." + ROOT_DOMAIN;
}

/** Resuelve el tenant por slug (p. ej. el header `x-tenant`). Cae a DEFAULT. */
export function tenantBySlug(slug: string | null | undefined): Tenant {
  if (!slug) return DEFAULT_TENANT;
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? DEFAULT_TENANT;
}

/**
 * Tenant de la request: prioriza `x-tenant` (lo setea el middleware) y cae al
 * header Host. Útil en API routes y Server Components.
 */
export function tenantFromHeaders(headers: {
  get(name: string): string | null;
}): Tenant {
  const slug = headers.get("x-tenant");
  if (slug) return tenantBySlug(slug);
  return tenantForHost(headers.get("host"));
}

/** Nombre de la env var con la contraseña del tenant. */
export function passwordEnvKey(slug: string): string {
  return `TENANT_${slug.toUpperCase().replace(/-/g, "_")}_PASSWORD`;
}

/**
 * Contraseña Basic Auth del tenant. Orden: TENANT_<SLUG>_PASSWORD → SITE_PASSWORD.
 * Devuelve "" si ninguna está definida (→ sin auth, útil en desarrollo).
 * Usa || (no ??): docker-compose pasa "" cuando la var está vacía en .env, y
 * un string vacío debe caer al fallback, no apagar el auth.
 */
export function tenantPassword(tenant: Tenant): string {
  return (
    process.env[passwordEnvKey(tenant.slug)] ||
    process.env.SITE_PASSWORD ||
    ""
  );
}
