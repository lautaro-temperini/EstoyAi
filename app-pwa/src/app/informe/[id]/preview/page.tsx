import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getInforme } from "@/lib/db/sqlite";
import { buildReportContent } from "@/lib/reports/verticals";
import { filterReportContent } from "@/lib/reports/campos";
import { assertValidId } from "@/lib/api/validate";
import { StatusChip, type EstadoChip } from "@/components/status-chip";
import { IS_DEV, devFieldReport } from "@/lib/dev-mock";
import { DEFAULT_CAMPOS } from "@/lib/reports/campos";
import { PreviewBack, PreviewActions } from "./preview-actions";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ctx?: string }>;
};

const PRIORIDAD_CHIP: Record<string, EstadoChip> = { ALTA: "alta", MEDIA: "media", BAJA: "baja" };

export default async function PreviewPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { ctx } = await searchParams;
  let valid = true;
  try {
    assertValidId(id);
  } catch {
    valid = false;
  }

  const row = valid ? getInforme(id) : null;
  // Dev: ver el preview con ids mock (m1…) sin SQLite. Prod: id válido + fila real.
  const report = row?.informeJson ?? (IS_DEV ? devFieldReport(id) : null);
  if (!report) notFound();

  const content = filterReportContent(buildReportContent(report), row?.campos ?? DEFAULT_CAMPOS);
  const enviado = row?.enviado ?? false;
  // Rol: en coordinación, solo el admin ve "Editar" (el resto es lectura). Dev = admin.
  const isAdmin = IS_DEV || (await headers()).get("x-role") === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="anim-fade fixed top-0 w-full z-50 flex items-center gap-3 px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <PreviewBack />
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex-1 truncate">Vista del informe</h1>
        <a
          href={`/api/informe/${id}/docx`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span className="font-caption text-caption">.docx</span>
        </a>
      </header>

      <main className="flex-grow pt-20 px-container-margin pb-28 max-w-2xl mx-auto w-full">
        {/* Hoja del informe */}
        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 space-y-stack-md">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-headline-md text-headline-md text-primary">{content.titular}</h2>
            {PRIORIDAD_CHIP[content.prioridad] && (
              <StatusChip estado={PRIORIDAD_CHIP[content.prioridad]} />
            )}
          </div>

          <p className="font-caption text-caption text-on-surface-variant">
            {[content.fecha, content.lugar].filter(Boolean).join("  ·  ")}
            {content.registradoPor && content.registradoPor !== "—" && (
              <> · Registrado por {content.registradoPor}</>
            )}
          </p>

          {content.motivoCriticidad && (
            <p className="font-body-sm text-body-sm text-on-surface-variant italic">
              {content.motivoCriticidad}
            </p>
          )}

          <section>
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide mb-1">
              Resumen Ejecutivo
            </h3>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
              {content.resumenEjecutivo || "—"}
            </p>
          </section>

          {content.sections.map((s, idx) => (
            <section key={idx} className="border-t border-outline-variant pt-stack-sm">
              <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide mb-2">
                {s.title}
              </h3>
              {s.kind === "fields" && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {s.fields.map((f, i) => (
                    <div key={i} className="min-w-0">
                      <dt className="font-caption text-caption text-on-surface-variant">{f.label}</dt>
                      <dd className="font-body-md text-body-md text-on-surface break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.kind === "bullets" && (
                <ul className="space-y-1">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-1.5 font-body-md text-body-md text-on-surface">
                      <span className="text-primary shrink-0 leading-none">•</span>
                      <span className="min-w-0">{it}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.kind === "text" && (
                <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                  {s.body}
                </p>
              )}
            </section>
          ))}

          <p className="border-t border-outline-variant pt-stack-sm font-caption text-caption text-on-surface-variant italic">
            {content.disclaimer}
          </p>
        </article>
      </main>

      <PreviewActions id={id} enviado={enviado} ctx={ctx} isAdmin={isAdmin} />
    </div>
  );
}
