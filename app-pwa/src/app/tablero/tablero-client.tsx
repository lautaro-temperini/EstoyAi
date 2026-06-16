"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CloudflareIcon, PodioIcon } from "@/components/brand-icons";
import { StatusChip, type EstadoChip } from "@/components/status-chip";
import { programaLabel } from "@/lib/reports/programa";
import type { Programa } from "@/lib/reports/schema";
import type { TriageItem, TriageCounts, TriageCategoria } from "@/lib/reports/triage";

const PROGRAMAS: Programa[] = ["primera-infancia", "ninez-adolescencia", "oficios"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const PROGRAMA_ICON: Record<Programa, string> = {
  "primera-infancia": "child_care",
  "ninez-adolescencia": "school",
  oficios: "construction",
};

function fmtFecha(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

const CATEGORIA_TO_ESTADO: Record<TriageCategoria, EstadoChip> = {
  ALTA: "alta",
  MEDIA: "media",
  BAJA: "baja",
  error: "error",
  proceso: "procesando",
};

type Filtro = TriageCategoria | "todos";

function nombreBeneficiario(b: TriageItem["beneficiario"]): string {
  const full = b ? `${b.nombre ?? ""} ${b.apellido ?? ""}`.trim() : "";
  return full || "Sin identificar";
}

/** Clave única de un beneficiario para el filtro (DNI si hay, si no el nombre). */
function benefKey(b: TriageItem["beneficiario"]): string | null {
  if (!b) return null;
  if (b.dni?.trim()) return b.dni.trim();
  const n = `${b.nombre ?? ""} ${b.apellido ?? ""}`.trim();
  return n || null;
}

type Feedback = { id: string; ok: boolean; msg: string } | null;
type Accion = "r2" | "podio";
type Busy = { id: string; accion: Accion } | null;

export function TableroClient({
  items,
  counts,
  isAdmin,
}: {
  items: TriageItem[];
  counts: TriageCounts;
  isAdmin: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [prog, setProg] = useState<Programa | "todos">("todos");
  const [query, setQuery] = useState("");
  const [benef, setBenef] = useState<{ key: string; label: string } | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [borrados, setBorrados] = useState<Set<string>>(new Set());

  // Beneficiarios únicos para el typeahead, filtrados por lo que se va escribiendo.
  const sugerencias = useMemo(() => {
    if (!query.trim() || benef) return [];
    const q = query.trim().toLowerCase();
    const seen = new Map<string, string>();
    for (const i of items) {
      const key = benefKey(i.beneficiario);
      if (!key || seen.has(key)) continue;
      const label = nombreBeneficiario(i.beneficiario);
      if (label.toLowerCase().includes(q)) seen.set(key, label);
    }
    return [...seen.entries()].slice(0, 8).map(([key, label]) => ({ key, label }));
  }, [query, benef, items]);

  const filtrados = useMemo(() => {
    return items.filter((i) => {
      if (borrados.has(i.id)) return false;
      if (filtro !== "todos" && i.categoria !== filtro) return false;
      if (prog !== "todos" && i.programa !== prog) return false;
      if (benef && benefKey(i.beneficiario) !== benef.key) return false;
      return true;
    });
  }, [items, filtro, prog, benef, borrados]);

  const chips: { id: Filtro; label: string; n: number }[] = [
    { id: "todos", label: "Todos", n: counts.total },
    { id: "ALTA", label: "Alta", n: counts.ALTA },
    { id: "MEDIA", label: "Media", n: counts.MEDIA },
    { id: "BAJA", label: "Baja", n: counts.BAJA },
  ];

  async function ejecutarAccion(id: string, accion: Accion) {
    setBusy({ id, accion });
    setFeedback(null);
    const endpoint = accion === "r2" ? "subir-r2" : "podio";
    const okMsg = accion === "r2" ? "Subido a Cloudflare." : "Anexado a Podio.";
    try {
      const res = await fetch(`/api/informe/${id}/${endpoint}`, { method: "POST" });
      if (res.ok) {
        setFeedback({ id, ok: true, msg: okMsg });
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFeedback({ id, ok: false, msg: data.error ?? `Error ${res.status}` });
      }
    } catch {
      setFeedback({ id, ok: false, msg: "No se pudo conectar con el servidor." });
    } finally {
      setBusy(null);
    }
  }

  async function borrar(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/informe/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBorrados((prev) => new Set(prev).add(id));
        setConfirmDel(null);
      } else {
        setFeedback({ id, ok: false, msg: `No se pudo borrar (${res.status})` });
      }
    } catch {
      setFeedback({ id, ok: false, msg: "No se pudo conectar con el servidor." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Chips de programa */}
      <div className="grid grid-cols-2 gap-2 mb-stack-lg">
        {(["todos", ...PROGRAMAS] as const).map((p) => {
          const active = prog === p;
          return (
            <button
              key={p}
              onClick={() => setProg(p)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {p !== "todos" && (
                <span className="material-symbols-outlined text-[18px]">
                  {PROGRAMA_ICON[p]}
                </span>
              )}
              {p === "todos" ? "Todos los programas" : programaLabel(p)}
            </button>
          );
        })}
      </div>

      {/* Búsqueda por beneficiario (typeahead) */}
      <div className="relative mb-3">
        {benef ? (
          <div className="flex items-center gap-2 h-12 px-3 bg-surface-container-low border border-outline-variant rounded-lg">
            <span className="material-symbols-outlined text-[20px] text-primary">person</span>
            <span className="flex-grow font-body-md text-body-md text-on-surface truncate">
              {benef.label}
            </span>
            <button
              onClick={() => {
                setBenef(null);
                setQuery("");
              }}
              aria-label="Quitar filtro de beneficiario"
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o apellido…"
              className="w-full h-12 pl-11 pr-4 bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary focus:ring-0 outline-none transition-colors"
            />
            {sugerencias.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg overflow-hidden">
                {sugerencias.map((s) => (
                  <li key={s.key}>
                    <button
                      onClick={() => {
                        setBenef(s);
                        setQuery("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low font-body-md text-body-md text-on-surface flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                        person
                      </span>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Chips de criticidad */}
      <div className="flex flex-wrap gap-2 mb-2">
        {chips.map((c) => {
          const active = filtro === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {c.label}
              <span className={`text-[11px] font-bold ${active ? "opacity-90" : "opacity-70"}`}>
                {c.n}
              </span>
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <p className="text-center text-body-md text-on-surface-variant pt-8">
          No hay informes para este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((i) => {
            const fb = feedback?.id === i.id ? feedback : null;
            const isBusy = busy?.id === i.id;
            return (
              <li
                key={i.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
              >
                <Link
                  href={`/informe/${i.id}/preview?ctx=coord`}
                  className="block p-4 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                >
                  <div className="flex justify-end">
                    <StatusChip estado={CATEGORIA_TO_ESTADO[i.categoria]} />
                  </div>
                  <p className="mt-1 font-label-md text-label-md text-on-surface font-semibold truncate">
                    {nombreBeneficiario(i.beneficiario)}
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant">
                    {programaLabel(i.programa)} · {fmtFecha(i.createdAt)}
                  </p>

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
                          <span className="text-primary shrink-0 leading-none">•</span>
                          <span className="min-w-0">{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>

                <div className="flex items-center gap-1 border-t border-outline-variant px-2 py-1.5">
                  <a
                    href={`/api/informe/${i.id}/docx`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">description</span>
                    <span className="font-caption text-caption">.docx</span>
                  </a>
                  <button
                    onClick={() => ejecutarAccion(i.id, "r2")}
                    disabled={isBusy}
                    title="Subir a Cloudflare"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 transition-colors"
                  >
                    {isBusy && busy.accion === "r2" ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : (
                      <CloudflareIcon className="shrink-0" />
                    )}
                    <span className="font-caption text-caption">Cloudflare</span>
                  </button>
                  <button
                    onClick={() => ejecutarAccion(i.id, "podio")}
                    disabled={isBusy}
                    title="Anexar con Podio"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 transition-colors"
                  >
                    {isBusy && busy.accion === "podio" ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : (
                      <PodioIcon className="shrink-0" />
                    )}
                    <span className="font-caption text-caption">Podio</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDel(i.id)}
                      title="Borrar de coordinación"
                      aria-label="Borrar de coordinación"
                      className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg hover:bg-error-container text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>

                {fb && (
                  <p
                    className={`px-4 pb-2 font-caption text-caption ${fb.ok ? "text-secondary" : "text-error"}`}
                  >
                    {fb.msg}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmación de borrado (admin) */}
      {confirmDel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 anim-fade">
          <div className="anim-enter w-full max-w-sm m-4 bg-surface-container-lowest rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-stack-sm">
              <div className="w-11 h-11 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error">delete_forever</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Borrar de coordinación</h2>
            </div>
            <p className="font-body-md text-body-md text-error font-semibold mb-stack-lg">
              Se elimina el informe, el audio y el .docx de forma permanente. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="flex-1 h-12 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => borrar(confirmDel)}
                disabled={deleting}
                className="flex-1 h-12 rounded-lg bg-error text-on-error font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {deleting ? (
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                ) : (
                  "Borrar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
