"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SECCION_IDS,
  SECCION_TITULOS,
  DEFAULT_CAMPOS,
  type SeccionId,
  type CamposConfig,
} from "@/lib/reports/campos";
import type { FieldReport, Prioridad } from "@/lib/reports/schema";
import { StatusChip, ESTADO_CHIP, type EstadoChip } from "@/components/status-chip";
import { IS_DEV, devInformeData } from "@/lib/dev-mock";

// ── Tipos locales ────────────────────────────────────────────────────────────

interface InformeData {
  id: string;
  estado: string;
  informe: FieldReport | null;
  campos: CamposConfig | null;
  enviado: boolean;
}

const PRIORIDADES: Prioridad[] = ["ALTA", "MEDIA", "BAJA"];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Prioridad → estado estandarizado del StatusChip (un solo sistema de color). */
const PRIO_CHIP: Record<Prioridad, EstadoChip> = { ALTA: "alta", MEDIA: "media", BAJA: "baja" };

/** secciones that cannot be deselected */
const LOCKED: SeccionId[] = ["identificacion"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InformePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<InformeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Local selection state — initialised from loaded campos, defaults to all.
  const [secciones, setSecciones] = useState<Set<SeccionId>>(
    new Set(DEFAULT_CAMPOS.secciones),
  );

  const [showTranscript, setShowTranscript] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Edición del output (corrección del promotor antes de enviar).
  const [resumen, setResumen] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("MEDIA");
  const [motivo, setMotivo] = useState("");
  const [accionesText, setAccionesText] = useState("");

  // Gate de envío a coordinación.
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── Load informe ───────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/informe/${id}`, { cache: "no-store" }).catch(() => null);
        let d: InformeData;
        if (res && res.ok) {
          d = (await res.json()) as InformeData;
        } else if (IS_DEV) {
          d = devInformeData(id); // dev: ver UI con ids mock (m1, r1…)
        } else {
          setFetchError(res?.status === 404 ? "Informe no encontrado." : "Error al cargar el informe.");
          return;
        }
        if (!active) return;
        setData(d);
        setEnviado(d.enviado);
        if (d.campos?.secciones?.length) {
          setSecciones(new Set(d.campos.secciones));
        }
        if (d.informe) {
          setResumen(d.informe.resumen ?? "");
          setPrioridad(d.informe.prioridad ?? "MEDIA");
          setMotivo(d.informe.motivoCriticidad ?? "");
          setAccionesText((d.informe.accionesPendientes ?? []).join("\n"));
        }
      } catch {
        if (active) setFetchError("No se pudo conectar con el servidor.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // ── Toggle section ─────────────────────────────────────────────────────────

  const toggle = useCallback((sec: SeccionId) => {
    if (LOCKED.includes(sec)) return;
    setSecciones((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec);
      else next.add(sec);
      return next;
    });
    setSaved(false);
    setSaveError(null);
  }, []);

  // ── Save + regenerate ──────────────────────────────────────────────────────

  const guardar = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      // 1) Edición del output (resumen/prioridad/motivo/acciones).
      const editRes = await fetch(`/api/informe/${id}/editar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen,
          prioridad,
          motivoCriticidad: motivo,
          accionesPendientes: accionesText.split("\n").map((a) => a.trim()).filter(Boolean),
        }),
      });
      if (!editRes.ok) {
        const err = (await editRes.json().catch(() => ({}))) as { error?: string };
        setSaveError(err.error ?? `Error ${editRes.status}`);
        return;
      }
      // 2) Secciones del .docx.
      const camposBody: CamposConfig = { secciones: [...secciones] };
      const res = await fetch(`/api/informe/${id}/campos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(camposBody),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(err.error ?? `Error ${res.status}`);
        return;
      }
      setSaved(true);
    } catch {
      setSaveError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }, [id, secciones, resumen, prioridad, motivo, accionesText]);

  const enviar = useCallback(async () => {
    setEnviando(true);
    setSendError(null);
    try {
      // Guardar la edición antes de enviar (best-effort; no bloquea si campos falla).
      await fetch(`/api/informe/${id}/editar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen,
          prioridad,
          motivoCriticidad: motivo,
          accionesPendientes: accionesText.split("\n").map((a) => a.trim()).filter(Boolean),
        }),
      }).catch(() => {});
      const res = await fetch(`/api/informe/${id}/enviar`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSendError(err.error ?? `Error ${res.status}`);
        return;
      }
      setEnviado(true);
      router.push("/registros");
    } catch {
      setSendError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }, [id, resumen, prioridad, motivo, accionesText, router]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-container-margin">
        <span className="material-symbols-outlined text-error text-[48px]">error</span>
        <p className="font-headline-sm text-headline-sm text-on-surface text-center">
          {fetchError ?? "Informe no encontrado."}
        </p>
        <button
          onClick={() => router.push(`/estado/${id}`)}
          className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-md text-label-md"
        >
          Volver al estado
        </button>
      </div>
    );
  }

  const informe = data.informe;
  // El nombre del beneficiario sale de los campos fijos, nunca del audio.
  const b = informe?.metadatos?.beneficiario;
  const titular =
    (b?.apellido && b?.nombre ? `${b.apellido} ${b.nombre}` : b?.nombre) ||
    (informe?.metadatos?.tipo === "grupal" ? "Actividad Grupal" : "Registro");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="anim-fade fixed top-0 w-full z-50 flex items-center gap-3 px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 -ml-2 hover:bg-surface-container-low rounded-full text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">
            Editar informe
          </h1>
          {titular && (
            <p className="font-caption text-caption text-on-surface-variant truncate">
              {titular}
            </p>
          )}
        </div>
      </header>

      <main className="flex-grow pt-20 pb-28 px-container-margin max-w-xl mx-auto w-full space-y-stack-md">

        {/* Resumen del informe */}
        {informe && (
          <section className="anim-enter bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md space-y-stack-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                Revisión
              </h2>
              {enviado ? (
                <span className="shrink-0 px-2 py-1 rounded text-[11px] font-bold bg-secondary-container text-on-secondary-container">
                  En coordinación
                </span>
              ) : (
                <StatusChip estado={PRIO_CHIP[prioridad]} />
              )}
            </div>

            {/* Prioridad */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                Prioridad
              </label>
              <div className="flex gap-2">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridad(p)}
                    className={`flex-1 h-10 rounded-lg font-label-sm text-label-sm transition-colors disabled:opacity-60 ${
                      prioridad === p
                        ? ESTADO_CHIP[PRIO_CHIP[p]].cls
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    {ESTADO_CHIP[PRIO_CHIP[p]].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo de criticidad */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                Motivo de criticidad
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setSaved(false); }}
                placeholder="Por qué esta prioridad (máx. ~15 palabras)"
                className="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary outline-none disabled:bg-surface-container-low disabled:text-on-surface-variant"
              />
            </div>

            {/* Resumen */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                Resumen
              </label>
              <textarea
                value={resumen}
                onChange={(e) => { setResumen(e.target.value); setSaved(false); }}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface leading-relaxed focus:border-primary outline-none resize-y disabled:bg-surface-container-low disabled:text-on-surface-variant"
              />
            </div>

            {/* Acciones pendientes (una por línea) */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                Acciones pendientes <span className="font-caption text-caption">(una por línea)</span>
              </label>
              <textarea
                value={accionesText}
                onChange={(e) => { setAccionesText(e.target.value); setSaved(false); }}
                rows={3}
                placeholder="Ej: Turno pediátrico\nContactar a trabajo social"
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary outline-none resize-y disabled:bg-surface-container-low disabled:text-on-surface-variant"
              />
            </div>

            {informe.transcripcion && (
              <div className="pt-1 border-t border-outline-variant">
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showTranscript ? "rotate-180" : ""}`}
                  >
                    expand_more
                  </span>
                  {showTranscript ? "Ocultar transcripción" : "Ver transcripción completa"}
                </button>
                {showTranscript && (
                  <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {informe.transcripcion}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Secciones a incluir */}
        <section className="anim-enter bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
          <div className="mb-stack-sm">
            <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              Secciones del documento
            </h2>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Elegí qué secciones incluir en el .docx. &quot;Identificación&quot; siempre se incluye.
            </p>
          </div>

          <ul className="divide-y divide-outline-variant">
            {SECCION_IDS.map((sec) => {
              const locked = LOCKED.includes(sec);
              const checked = locked || secciones.has(sec);
              return (
                <li key={sec}>
                  <label
                    className={`flex items-center gap-3 py-3 ${locked ? "cursor-default" : "cursor-pointer hover:bg-surface-container-low rounded-lg px-2 -mx-2 transition-colors"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(sec)}
                      className="w-5 h-5 accent-primary rounded shrink-0"
                    />
                    <span
                      className={`font-body-md text-body-md ${locked ? "text-on-surface-variant" : checked ? "text-on-surface" : "text-on-surface-variant line-through"}`}
                    >
                      {SECCION_TITULOS[sec]}
                    </span>
                    {locked && (
                      <span className="ml-auto font-caption text-caption text-on-surface-variant">
                        Siempre
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Feedback */}
        {saveError && (
          <p className="font-body-sm text-body-sm text-error px-1">{saveError}</p>
        )}
        {sendError && (
          <p className="font-body-sm text-body-sm text-error px-1">{sendError}</p>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-secondary">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <p className="font-body-sm text-body-sm">Cambios guardados.</p>
          </div>
        )}
      </main>

      {/* Sticky bottom bar — Guardar siempre; Enviar solo si es borrador. */}
      <div className="fixed bottom-0 w-full bg-surface border-t border-outline-variant px-container-margin py-3 flex gap-3 max-w-xl mx-auto left-0 right-0">
        <button
          onClick={guardar}
          disabled={saving || enviando}
          className={`h-14 px-4 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97] transition-transform ${
            enviado
              ? "flex-1 bg-primary text-on-primary"
              : "bg-surface-container-low border border-outline-variant text-primary"
          }`}
        >
          {saving ? (
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">save</span>
          )}
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {!enviado && (
          <button
            onClick={enviar}
            disabled={saving || enviando}
            className="flex-1 h-14 bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {enviando ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">send</span>
            )}
            {enviando ? "Enviando…" : "Enviar a coordinación"}
          </button>
        )}
      </div>
    </div>
  );
}
