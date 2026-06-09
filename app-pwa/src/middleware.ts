import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic Auth a nivel de toda la instalación.
 *
 * Protege la app con una contraseña única configurada en SITE_PASSWORD.
 * - Si SITE_PASSWORD no está definida → no se aplica auth (desarrollo local con `npm run dev`).
 * - El usuario se ignora (puede ser cualquier string); solo se valida la contraseña.
 * - Una vez autenticado, el browser cachea las credenciales para la sesión.
 *
 * Rutas EXCLUIDAS (ver `config.matcher` abajo):
 * - `/api/informe/[id]/*` → las llama n8n desde dentro de la red Docker; no puede
 *   autenticarse con Basic Auth. (Quedan accesibles solo dentro de `sede-net`.)
 * - Assets estáticos (`_next`, íconos, sw.js, manifest) → no son sensibles y deben
 *   servirse sin gatear el shell de la PWA.
 */
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  // Sin contraseña configurada → middleware no-op (desarrollo local).
  if (!password) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      // atob está disponible en el Edge runtime de Next.js middleware.
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const pass = sep === -1 ? "" : decoded.slice(sep + 1);
      if (pass === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Pequeños Pasos", charset="UTF-8"',
    },
  });
}

export const config = {
  // Corre en todo excepto los callbacks de n8n y los assets estáticos.
  matcher: [
    "/((?!api/informe|_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest).*)",
  ],
};
