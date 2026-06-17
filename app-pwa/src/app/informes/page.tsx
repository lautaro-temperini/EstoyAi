import { headers } from "next/headers";
import { tenantFromHeaders } from "@/lib/tenants/config";
import { listInformesByTenant } from "@/lib/db/sqlite";
import { listTriageItems, countByCategoria } from "@/lib/reports/triage";
import { AutoRefresh } from "./auto-refresh";
import { TableroClient } from "./tablero-client";
import { MOCK_ITEMS, MOCK_BY_TENANT } from "./mock";

// Siempre fresco: lee SQLite en cada request (estados cambian a medida que n8n procesa).
export const dynamic = "force-dynamic";

export default async function InformesPage() {
  const h = await headers();
  const tenant = tenantFromHeaders(h);
  const isDev = process.env.NODE_ENV === "development";
  // El tablero muestra SOLO lo enviado a coordinación (gate del promotor).
  // Dev: mock tenant-específico para ver UI/filtros sin datos reales.
  const mockItems = MOCK_BY_TENANT[tenant.slug] ?? MOCK_ITEMS;
  const items = isDev
    ? mockItems.filter((i) => i.estado === "LISTO")
    : listTriageItems(listInformesByTenant(tenant.slug, { soloEnviados: true }));
  const counts = countByCategoria(items);
  // Borrar en coordinación: solo admin (en dev se habilita para poder probar).
  const isAdmin = isDev || h.get("x-role") === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <AutoRefresh seconds={20} />

      {/* Header solo mobile (en desktop navega la barra superior). */}
      <header className="md:hidden anim-fade fixed top-0 w-full z-40 flex items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <h1 className="font-headline-sm text-headline-sm text-on-surface">Informes del equipo</h1>
      </header>

      <main className="flex-grow pt-20 md:pt-24 px-container-margin pb-28 md:pb-12 max-w-xl mx-auto w-full">
        <p className="font-caption text-caption text-on-surface-variant mb-3">{tenant.orgName}</p>

        {counts.total === 0 ? (
          <p className="text-center text-body-md text-on-surface-variant pt-12">
            Todavía no hay informes en esta sede.
          </p>
        ) : (
          <TableroClient items={items} counts={counts} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}
