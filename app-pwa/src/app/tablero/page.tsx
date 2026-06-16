import { headers } from "next/headers";
import Link from "next/link";
import { tenantFromHeaders } from "@/lib/tenants/config";
import { listInformesByTenant } from "@/lib/db/sqlite";
import { listTriageItems, countByCategoria } from "@/lib/reports/triage";
import { AutoRefresh } from "./auto-refresh";
import { TableroClient } from "./tablero-client";
import { MOCK_ITEMS } from "./mock";

// Siempre fresco: lee SQLite en cada request (estados cambian a medida que n8n procesa).
export const dynamic = "force-dynamic";

export default async function TableroPage() {
  const tenant = tenantFromHeaders(await headers());
  // Dev: mock para ver UI/filtros sin depender de datos. Prod: datos reales de SQLite.
  const items =
    process.env.NODE_ENV === "development"
      ? MOCK_ITEMS
      : listTriageItems(listInformesByTenant(tenant.slug));
  const counts = countByCategoria(items);

  return (
    <div className="min-h-screen flex flex-col">
      <AutoRefresh seconds={20} />

      <header className="anim-fade fixed top-0 w-full z-50 flex items-center gap-4 px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <Link
          href="/registro"
          aria-label="Inicio"
          className="p-2 -ml-2 hover:bg-surface-container-low rounded-full text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline-sm text-headline-sm text-on-surface">Coordinación</h1>
      </header>

      <main className="flex-grow pt-20 px-container-margin pb-12 max-w-xl mx-auto w-full">
        <p className="font-caption text-caption text-on-surface-variant mb-3">{tenant.orgName}</p>

        {counts.total === 0 ? (
          <p className="text-center text-body-md text-on-surface-variant pt-12">
            Todavía no hay informes en esta sede.
          </p>
        ) : (
          <TableroClient items={items} counts={counts} />
        )}
      </main>
    </div>
  );
}
