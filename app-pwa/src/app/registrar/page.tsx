import { headers } from "next/headers";
import { tenantFromHeaders } from "@/lib/tenants/config";
import { verticalForTenant } from "@/lib/reports/verticals";
import { ProgramaPicker } from "./programa-picker";

// El tenant (y por ende el catálogo de programas) se resuelve por Host en el
// servidor; no se puede prerenderizar estáticamente.
export const dynamic = "force-dynamic";

export default async function RegistrarPage() {
  const tenant = tenantFromHeaders(await headers());
  const { programas } = verticalForTenant(tenant.slug);
  return <ProgramaPicker programas={programas} />;
}
