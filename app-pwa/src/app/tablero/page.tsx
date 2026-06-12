import { headers } from "next/headers";
import Link from "next/link";
import { tenantFromHeaders } from "@/lib/tenants/config";
import { listInformesByTenant } from "@/lib/db/sqlite";
import { buildTriage, type TriageItem } from "@/lib/reports/triage";
import { programaLabel } from "@/lib/reports/programa";
import type { Prioridad } from "@/lib/reports/schema";
import { AutoRefresh } from "./auto-refresh";

// Siempre fresco: lee SQLite en cada request (estados cambian a medida que n8n procesa).
export const dynamic = "force-dynamic";

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function fmtFecha(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

const PRIORIDAD_BADGE: Record<Prioridad, { label: string; cls: string }> = {
  ALTA: { label: "ALTA", cls: "bg-error-container text-on-error-container" },
  MEDIA: { label: "MEDIA", cls: "bg-tertiary-container text-on-tertiary-container" },
  BAJA: { label: "BAJA", cls: "bg-surface-container-high text-on-surface-variant" },
};

function nombreBeneficiario(i: TriageItem): string {
  const b = i.beneficiario;
  const full = b ? `${b.nombre ?? ""} ${b.apellido ?? ""}`.trim() : "";
  return full || "Sin identificar";
}

function Contador({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${cls}`}>
      <span className="font-headline-sm text-headline-sm font-bold leading-none">{n}</span>
      <span className="font-caption text-caption mt-1">{label}</span>
    </div>
  );
}

/** Card de un informe clínico (con prioridad). */
function CardInforme({ i }: { i: TriageItem }) {
  const badge = i.prioridad ? PRIORIDAD_BADGE[i.prioridad] : null;
  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <Link
        href={`/informe/${i.id}`}
        className="block p-4 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
              {nombreBeneficiario(i)}
            </p>
            <p className="font-caption text-caption text-on-surface-variant">
              {programaLabel(i.programa)} · {fmtFecha(i.createdAt)}
            </p>
          </div>
          {badge && (
            <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-bold ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>

        {i.motivoCriticidad && (
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant line-clamp-2">
            {i.motivoCriticidad}
          </p>
        )}

        {i.accionesPendientes.length > 0 && (
          <ul className="mt-2 space-y-1">
            {i.accionesPendientes.map((a, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 font-caption text-caption text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                  check_circle
                </span>
                <span className="min-w-0">{a}</span>
              </li>
            ))}
          </ul>
        )}
      </Link>

      {i.tieneDocx && (
        <div className="border-t border-outline-variant px-2 py-1.5">
          <a
            href={`/api/informe/${i.id}/docx`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span className="font-caption text-caption">Descargar .docx</span>
          </a>
        </div>
      )}
    </li>
  );
}

/** Card de un informe que falló en el pipeline (técnico, no clínico). */
function CardError({ i }: { i: TriageItem }) {
  return (
    <li className="bg-error-container/30 border border-error/40 rounded-xl p-4">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-[20px] text-error shrink-0">
          error
        </span>
        <div className="min-w-0">
          <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
            {nombreBeneficiario(i)}
          </p>
          <p className="font-caption text-caption text-on-surface-variant">
            {programaLabel(i.programa)} · {fmtFecha(i.createdAt)}
          </p>
          {i.error && (
            <p className="mt-1 font-caption text-caption text-error break-words">{i.error}</p>
          )}
          <Link
            href={`/estado/${i.id}`}
            className="mt-2 inline-flex items-center gap-1.5 font-caption text-caption text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Reintentar
          </Link>
        </div>
      </div>
    </li>
  );
}

function CardProceso({ i }: { i: TriageItem }) {
  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3">
      <span className="material-symbols-outlined text-[20px] text-on-surface-variant animate-spin shrink-0">
        progress_activity
      </span>
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
          {nombreBeneficiario(i)}
        </p>
        <p className="font-caption text-caption text-on-surface-variant">
          {programaLabel(i.programa)} · {fmtFecha(i.createdAt)} · Procesando
        </p>
      </div>
    </li>
  );
}

function Seccion({
  titulo,
  hint,
  children,
}: {
  titulo: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-stack-lg">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-label-md text-label-md font-bold text-on-surface">{titulo}</h2>
        {hint && <span className="font-caption text-caption text-on-surface-variant">{hint}</span>}
      </div>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

export default async function TableroPage() {
  const tenant = tenantFromHeaders(await headers());
  const t = buildTriage(listInformesByTenant(tenant.slug));
  const vacio = t.resumen.total === 0;

  // "Atención hoy" ya incluye los ALTA y los MEDIA/BAJA con acciones pendientes;
  // las secciones por prioridad muestran el resto para no duplicar cards.
  const enAtencion = new Set(t.atencionHoy.map((i) => i.id));
  const mediaResto = t.media.filter((i) => !enAtencion.has(i.id));
  const bajaResto = t.baja.filter((i) => !enAtencion.has(i.id));

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

        {vacio ? (
          <p className="text-center text-body-md text-on-surface-variant pt-12">
            Todavía no hay informes en esta sede.
          </p>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2 mb-stack-lg">
              <Contador n={t.resumen.alta} label="Alta" cls="bg-error-container text-on-error-container" />
              <Contador n={t.resumen.media} label="Media" cls="bg-tertiary-container text-on-tertiary-container" />
              <Contador n={t.resumen.baja} label="Baja" cls="bg-surface-container-high text-on-surface-variant" />
              <Contador n={t.resumen.pendientes} label="Con acciones" cls="bg-surface-container-low text-on-surface-variant" />
              <Contador n={t.resumen.errores} label="Errores" cls="bg-surface-container-low text-error" />
              <Contador n={t.resumen.total} label="Total" cls="bg-surface-container-low text-on-surface-variant" />
            </div>

            {t.atencionHoy.length > 0 && (
              <Seccion titulo="Necesita atención hoy" hint={`${t.atencionHoy.length}`}>
                {t.atencionHoy.map((i) => (
                  <CardInforme key={i.id} i={i} />
                ))}
              </Seccion>
            )}

            {t.errores.length > 0 && (
              <Seccion titulo="Errores a reintentar" hint={`${t.errores.length}`}>
                {t.errores.map((i) => (
                  <CardError key={i.id} i={i} />
                ))}
              </Seccion>
            )}

            {mediaResto.length > 0 && (
              <Seccion titulo="Prioridad media" hint={`${mediaResto.length}`}>
                {mediaResto.map((i) => (
                  <CardInforme key={i.id} i={i} />
                ))}
              </Seccion>
            )}

            {bajaResto.length > 0 && (
              <Seccion titulo="Prioridad baja" hint={`${bajaResto.length}`}>
                {bajaResto.map((i) => (
                  <CardInforme key={i.id} i={i} />
                ))}
              </Seccion>
            )}

            {t.enProceso.length > 0 && (
              <Seccion titulo="En proceso" hint={`${t.enProceso.length}`}>
                {t.enProceso.map((i) => (
                  <CardProceso key={i.id} i={i} />
                ))}
              </Seccion>
            )}
          </>
        )}
      </main>
    </div>
  );
}
