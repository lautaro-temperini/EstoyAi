"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { FieldReport, Prioridad } from "@/lib/reports/schema";
import { deleteReport, getReport, updateEstado } from "@/lib/reports/store-client";
import { buildReportContent } from "@/lib/reports/export/content";
import { downloadReport, type ReportFormat } from "@/lib/reports/export/download";

function fmtDur(ms: number | null): string | null {
  if (!ms) return null;
  const t = Math.round(ms / 1000);
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = (t % 60).toString().padStart(2, "0");
  return `${m}:${s} min`;
}

const PRIORIDAD_STYLE: Record<Prioridad, string> = {
  ALTA: "bg-error-container text-on-error-container",
  MEDIA: "bg-tertiary-container text-on-tertiary-container",
  BAJA: "bg-secondary-container text-on-secondary-container",
};

export default function ReportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [report, setReport] = useState<FieldReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState<ReportFormat | null>(null);

  const descargar = async (format: ReportFormat) => {
    if (!report || downloading) return;
    setDownloading(format);
    try {
      console.log(`[informe] descargar ${format}`);
      await downloadReport(report, format);
    } catch (e) {
      console.error(`[informe] descarga ${format} falló:`, e);
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        console.log(`[informe] load report ${id} from IndexedDB`);
        const found = await getReport(id);
        if (!found) {
          if (active) setNotFound(true);
          return;
        }
        console.log("[informe] report loaded:", found);
        if (active) {
          setReport(found);
          setSaved(found.estado === "CONFIRMADO");
        }
      } catch (e) {
        console.error("[informe] load failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const confirmar = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      console.log(`[informe] confirmar ${id} → estado CONFIRMADO`);
      const updated = await updateEstado(id, "CONFIRMADO");
      if (updated) setSaved(true);
    } catch (e) {
      console.error("[informe] confirm failed:", e);
    } finally {
      setSaving(false);
    }
  };

  // Re-record: the LLM summary may be off, so let the operator capture again.
  // Beneficiary/tipo persist in flow context, so /grabar resumes the same flow.
  // Discard this draft first (unless already confirmed) so it doesn't linger.
  const reintentar = async () => {
    if (!saved) {
      console.log(`[informe] reintentar → discarding draft ${id}`);
      await deleteReport(id).catch(() => {});
    }
    console.log("[informe] reintentar grabación → /grabar");
    router.push("/grabar");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-container-margin text-center">
        <p className="font-headline-sm text-headline-sm">Informe no encontrado.</p>
        <button
          onClick={() => router.push("/")}
          className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-md"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const dur = fmtDur(report.metadatos.durationMs);
  const content = buildReportContent(report);

  return (
    <div className="pb-32">
      {/* Ambient polish */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-secondary-container/20 blur-[80px] rounded-full" />
      </div>

      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 -ml-2 hover:bg-surface-container-low transition-colors rounded-full text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </header>

      <main className="mt-16 px-container-margin pt-6 max-w-3xl mx-auto">
        {/* Header */}
        <section className="anim-enter mb-5">
          <p className="text-caption text-on-surface-variant uppercase tracking-wide">
            Informe de Campo
          </p>
          <div className="flex justify-between items-start gap-3 mt-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {content.titular}
            </h1>
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${PRIORIDAD_STYLE[report.prioridad]}`}
            >
              {report.prioridad}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant mt-1">
            {content.fecha}
            {content.lugar ? ` · ${content.lugar}` : ""}
            {dur ? ` · ${dur}` : ""}
          </p>
        </section>

        {/* Executive summary — first */}
        <section className="anim-enter bg-surface-container-low border border-primary/20 p-5 rounded-xl mb-5">
          <h3 className="font-label-md text-label-md text-primary mb-2 uppercase tracking-wide">
            Resumen Ejecutivo
          </h3>
          <p className="text-body-md">{content.resumenEjecutivo}</p>
        </section>

        {/* Downloads */}
        <section className="anim-enter mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => descargar("docx")}
            disabled={!!downloading}
            className="h-12 bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            <span className="material-symbols-outlined">
              {downloading === "docx" ? "progress_activity" : "description"}
            </span>
            <span className={downloading === "docx" ? "animate-pulse" : ""}>
              Descargar Word (.docx)
            </span>
          </button>
          <button
            onClick={() => descargar("pdf")}
            disabled={!!downloading}
            className="h-12 bg-surface-container-low text-primary border border-outline-variant rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            <span className="material-symbols-outlined">
              {downloading === "pdf" ? "progress_activity" : "picture_as_pdf"}
            </span>
            <span className={downloading === "pdf" ? "animate-pulse" : ""}>Descargar PDF</span>
          </button>
        </section>

        {/* Structured sections */}
        <div className="space-y-5">
          {content.sections.map((s, i) => (
            <section
              key={i}
              className="anim-enter bg-surface-container-low/50 border border-outline-variant/30 p-5 rounded-xl"
            >
              <h3 className="font-label-md text-label-md text-primary mb-3 uppercase tracking-wide">
                {s.title}
              </h3>
              {s.kind === "fields" && (
                <dl className="space-y-1.5">
                  {s.fields.map((f, j) => (
                    <div key={j} className="flex gap-3 text-body-md">
                      <dt className="w-40 shrink-0 text-on-surface-variant font-medium">
                        {f.label}
                      </dt>
                      <dd className="flex-1 text-on-surface">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.kind === "bullets" && (
                <ul className="space-y-1.5">
                  {s.items.map((it, j) => (
                    <li key={j} className="flex gap-2 text-body-md">
                      <span className="text-primary">•</span>
                      <span className="flex-1">{it}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.kind === "text" && (
                <p className="text-body-md text-on-surface whitespace-pre-wrap">{s.body}</p>
              )}
            </section>
          ))}
        </div>

        {/* Transcript toggle */}
        <div className="mt-6">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-2 text-primary font-label-md text-label-md hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">description</span>
            {showTranscript ? "Ocultar transcripción" : "Ver transcripción completa"}
          </button>
          {showTranscript && (
            <p className="mt-3 px-3 text-body-md text-on-surface-variant whitespace-pre-wrap">
              {report.transcripcion}
            </p>
          )}
        </div>
      </main>

      {/* Confirm */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-outline-variant p-container-margin z-50">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={reintentar}
            disabled={saving}
            title="Volver a grabar si el resumen no es preciso"
            className="flex-1 h-[56px] bg-surface-container-low text-primary border border-outline-variant rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 ease-out disabled:opacity-50"
          >
            <span className="material-symbols-outlined">refresh</span>
            Reintentar
          </button>
          <button
            onClick={confirmar}
            disabled={saving || saved}
            className="flex-1 h-[56px] bg-primary text-white rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 ease-out shadow-sm disabled:opacity-90"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Guardando...
              </>
            ) : saved ? (
              <>
                <span className="material-symbols-outlined">check</span>
                ¡Guardado con éxito!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check</span>
                Confirmar informe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
