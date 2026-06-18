import type { InformeRow } from "@/lib/db/sqlite";
import { tenantFromHeaders } from "@/lib/tenants/config";

/**
 * Aislamiento multi-tenant en las rutas /api/informe y /api/admin.
 *
 * El middleware autentica al tenant (Host → x-tenant) pero NO ata el `id` del
 * informe al tenant que lo pide. Sin este check, un usuario autenticado en la
 * ONG A puede leer/editar/enviar/borrar un informe de la ONG B con solo conocer
 * su UUID (IDOR cross-tenant). Cada ruta con `[id]` debe llamar a este guard.
 *
 * Devuelve true si el informe pertenece al tenant de la request. Las filas se
 * insertan SIEMPRE con metadata.tenant (toReportMetadata, server-side), así que
 * la comparación estricta es segura: un mismatch (incluido tenant null en filas
 * legacy) se trata como "no es tuyo".
 */
export function informeBelongsToRequest(
  row: InformeRow,
  headers: { get(name: string): string | null },
): boolean {
  const requestTenant = tenantFromHeaders(headers).slug;
  return (row.metadata?.tenant ?? null) === requestTenant;
}
