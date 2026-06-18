import { NextResponse } from "next/server";

/**
 * Autenticación de los callbacks internos de n8n (extraccion / generar-docx /
 * error). Estas rutas están EXCLUIDAS del Basic Auth del middleware porque las
 * llama n8n desde la red Docker sin credenciales de usuario. Sin un secreto
 * compartido quedaban abiertas: cualquiera que alcance el host (p. ej. vía el
 * Cloudflare Tunnel) podía sobrescribir la extracción de cualquier UUID.
 *
 * n8n manda el secreto en el header `X-Internal-Token`. Si N8N_CALLBACK_SECRET
 * no está configurada se permite el llamado (desarrollo local / compatibilidad
 * con instalaciones que aún no regeneraron el workflow) — igual que SITE_PASSWORD
 * vacío apaga el Basic Auth. EN PRODUCCIÓN debe estar seteada.
 *
 * Comparación en tiempo constante para no filtrar el secreto por timing.
 */
export function assertInternalCall(request: Request): NextResponse | null {
  const expected = process.env.N8N_CALLBACK_SECRET;
  if (!expected) return null; // sin secreto → sin gate (dev / pre-migración)
  const provided = request.headers.get("x-internal-token") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  return null;
}

/** Igualdad de strings en tiempo constante (Edge/Node, sin depender de crypto). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
