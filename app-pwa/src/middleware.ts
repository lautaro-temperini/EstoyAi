import { NextResponse, type NextRequest } from "next/server";
import { tenantForHost, tenantPassword } from "@/lib/tenants/config";

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
 * - `/api/informe/[id]/*` → las llama n8n desde la red Docker; sin Basic Auth.
 * - Assets estáticos (`_next`, íconos, sw.js, manifest) → sin gatear.
 */
export function middleware(req: NextRequest) {
  const tenant = tenantForHost(req.headers.get("host"));
  const password = tenantPassword(tenant);

  // Propaga el tenant a los handlers río abajo.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant", tenant.slug);
  const pass = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Sin contraseña configurada → solo inyecta el tenant y sigue.
  if (!password) {
    return pass();
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      // atob está disponible en el Edge runtime de Next.js middleware.
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const provided = sep === -1 ? "" : decoded.slice(sep + 1);
      if (provided === password) {
        return pass();
      }
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${tenant.orgName}", charset="UTF-8"`,
    },
  });
}

export const config = {
  // Corre en todo excepto los callbacks de n8n y los assets estáticos.
  matcher: [
    "/((?!api/informe|_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest).*)",
  ],
};
