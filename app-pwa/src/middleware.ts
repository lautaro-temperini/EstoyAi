import { NextResponse, type NextRequest } from "next/server";
import {
  tenantForHost,
  tenantPassword,
  tenantAdminPassword,
  isLandingHost,
  normalizeHost,
  ROOT_DOMAIN,
} from "@/lib/tenants/config";
import { timingSafeEqual } from "@/lib/api/internal-auth";

// ── Rate-limit de Basic Auth (anti fuerza bruta) ─────────────────────────────
// Contador de intentos FALLIDOS por IP en una ventana. En la sede corre un solo
// proceso (next start standalone), así que este Map en memoria alcanza; no hay
// store distribuido. Caveat: detrás de NAT/proxy todos los promotores pueden
// compartir IP — por eso el umbral es alto (no bloquea uso legítimo) y la
// ventana corta. Si el deploy escala a varias instancias, mover a un store.
const RL_WINDOW_MS = 5 * 60_000;
const RL_MAX_FAILS = 30;
const failedAuth = new Map<string, { count: number; first: number }>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("cf-connecting-ip") ||
    (xff ? xff.split(",")[0].trim() : "") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const e = failedAuth.get(ip);
  if (!e) return false;
  if (Date.now() - e.first > RL_WINDOW_MS) {
    failedAuth.delete(ip);
    return false;
  }
  return e.count >= RL_MAX_FAILS;
}

function recordFail(ip: string): void {
  const now = Date.now();
  const e = failedAuth.get(ip);
  if (!e || now - e.first > RL_WINDOW_MS) {
    failedAuth.set(ip, { count: 1, first: now });
  } else {
    e.count += 1;
  }
}

/**
 * HTTP Basic Auth multi-tenant.
 *
 * El subdominio (Host header) elige la ONG; cada una tiene su propia contraseña
 * (TENANT_<SLUG>_PASSWORD, con fallback a SITE_PASSWORD). Ver lib/tenants/config.
 * - Si el tenant no tiene contraseña → no se aplica auth (desarrollo local).
 * - El usuario se ignora; solo se valida la contraseña.
 * - El realm muestra el nombre de la ONG.
 *
 * Además inyecta `x-tenant` en la request para que los Server Components y las
 * API routes sepan qué ONG sirve esta petición (branding, system prompt).
 *
 * Rutas EXCLUIDAS (ver `config.matcher`):
 * - Callbacks de n8n: `/api/informe/[id]/(extraccion|generar-docx|error)` →
 *   los llama n8n desde la red Docker; van protegidos por X-Internal-Token
 *   (N8N_CALLBACK_SECRET), no por Basic Auth. El resto de `/api/informe/*`
 *   (docx, enviar, editar, reprocesar, campos, subir-r2, podio, estado) SÍ pasa
 *   por auth + check de tenant: el gate se valida server-side, no solo en UI.
 * - Assets estáticos (`_next`, íconos, sw.js, manifest) → sin gatear.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");

  // ── Apex / www → landing pública ──────────────────────────────────────────
  // Sin login y sin pipeline: solo la página institucional. Cualquier ruta de
  // la app (grabar, registros, API de audio…) se redirige a la landing.
  if (isLandingHost(host)) {
    const { pathname } = req.nextUrl;
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", req.url));
    }
    // `/landing` no es URL pública: la canónica es `/` (rewrite interno).
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ── Subdominio de ONG → app con Basic Auth ────────────────────────────────
  // La landing no pertenece a los subdominios; en localhost/IP sí se permite
  // `/landing` para iterar el diseño en desarrollo.
  const isOngSubdomain = normalizeHost(host).endsWith("." + ROOT_DOMAIN);
  if (
    isOngSubdomain &&
    (req.nextUrl.pathname === "/landing" ||
      req.nextUrl.pathname.startsWith("/landing/"))
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const tenant = tenantForHost(host);
  const password = tenantPassword(tenant);
  const adminPassword = tenantAdminPassword(tenant);
  const isAdminPath = req.nextUrl.pathname.startsWith("/api/admin");

  // Propaga el tenant + rol a los handlers río abajo.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant", tenant.slug);
  const pass = (role: "admin" | "user") => {
    requestHeaders.set("x-role", role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };
  const forbidden = () => new NextResponse("Prohibido", { status: 403 });

  // Sin contraseña configurada → dev sin auth: rol admin para poder probar todo.
  if (!password) {
    return pass("admin");
  }

  // Demasiados intentos fallidos desde esta IP → frená la fuerza bruta.
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return new NextResponse("Demasiados intentos. Probá de nuevo en unos minutos.", {
      status: 429,
      headers: { "Retry-After": "300" },
    });
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      // atob está disponible en el Edge runtime de Next.js middleware.
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const provided = sep === -1 ? "" : decoded.slice(sep + 1);
      // Comparación en tiempo constante: no filtrar la contraseña por timing.
      const role =
        adminPassword && timingSafeEqual(provided, adminPassword)
          ? "admin"
          : timingSafeEqual(provided, password)
          ? "user"
          : null;
      if (role) {
        // Rutas admin: exigen rol admin (un user autenticado recibe 403).
        if (isAdminPath && role !== "admin") return forbidden();
        return pass(role);
      }
    }
  }

  recordFail(ip);
  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${tenant.orgName}", charset="UTF-8"`,
    },
  });
}

export const config = {
  // Corre en todo excepto los callbacks de n8n y los assets estáticos.
  // El docx GET NO está excluido: lo descarga el navegador del usuario, así que
  // pasa por Basic Auth como el resto (n8n solo escribe, no lee el .docx).
  matcher: [
    "/((?!api/informe/[^/]+/(?:extraccion|generar-docx|error)|_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest).*)",
  ],
};
