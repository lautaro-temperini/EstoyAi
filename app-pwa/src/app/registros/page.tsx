"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listRegistros,
  deleteRegistro,
  putRegistro,
  type Registro,
  type RegistroEstado,
} from "@/lib/queue/db";
import { StatusChip, type EstadoChip } from "@/components/status-chip";
import { programaLabel } from "@/lib/reports/programa";

/** Map the server-side processing estado onto the device-side estado. */
function mapServerEstado(s: string): RegistroEstado | null {
  switch (s) {
    case "RECIBIDO":
    case "EXTRAIDO":
      return "procesando";
    case "LISTO":
      return "listo";
    case "ERROR":
      return "error";
    default:
      return null;
  }
}

/** Estados que vale la pena re-consultar contra el servidor (no terminales). */
const REFRESH: RegistroEstado[] = ["encolado", "procesando"];

const ESTADO_TO_CHIP: Record<RegistroEstado, EstadoChip> = {
  encolado: "en-cola",
  procesando: "procesando",
  listo: "por-revisar",
  error: "error",
};

/** Chip del registro: si ya fue enviado a coordinación, prevalece sobre el estado. */
function chipDe(r: Registro): EstadoChip {
  return r.enviado ? "enviado" : ESTADO_TO_CHIP[r.estado];
}

// Mismo formato que /tablero: "16 jun · 12:30" — fecha consistente en toda la app.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtFecha(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

// Mock SOLO dev para ver la UI sin IndexedDB con datos. No afecta prod.
const IS_DEV = process.env.NODE_ENV === "development";
const MOCK_REGISTROS: Registro[] = [
  { id: "r1", titular: "Gómez Mateo", tipo: "individual", programa: "ninez-adolescencia", estado: "listo", enviado: true, createdAt: Date.now() - 3600_000 },
  { id: "r2", titular: "Pérez Sofía", tipo: "individual", programa: "primera-infancia", estado: "procesando", createdAt: Date.now() - 2 * 3600_000 },
  { id: "r3", titular: "Sosa Jorge", tipo: "individual", programa: "oficios", estado: "error", createdAt: Date.now() - 5 * 3600_000 },
  { id: "r4", titular: "Luna Valentina", tipo: "individual", programa: "primera-infancia", estado: "encolado", createdAt: Date.now() - 26 * 3600_000 },
  { id: "r5", titular: "Actividad grupal", tipo: "grupal", programa: "ninez-adolescencia", estado: "procesando", createdAt: Date.now() - 27 * 3600_000 },
];

export default function RegistrosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Registro[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [reintentoMsg, setReintentoMsg] = useState<{ id: string; msg: string } | null>(null);

  // Lee IndexedDB y reconcilia los registros no terminados con el servidor,
  // para que "procesando" avance a "listo"/"error" sin tener que abrir cada uno.
  const reconcile = useCallback(async () => {
    if (IS_DEV) {
      setItems(MOCK_REGISTROS);
      return;
    }
    const local = await listRegistros();
    let changed = false;
    const next = await Promise.all(
      local.map(async (r) => {
        // Refresca mientras no es terminal, y los listo aún no enviados (para captar `enviado`).
        const needsFetch = REFRESH.includes(r.estado) || (r.estado === "listo" && !r.enviado);
        if (!needsFetch) return r;
        try {
          const res = await fetch(`/api/informe/${r.id}`, { cache: "no-store" });
          if (!res.ok) return r; // el servidor todavía no lo tiene (404) — sigue igual
          const data = (await res.json()) as { estado?: string; enviado?: boolean };
          const mapped = data.estado ? mapServerEstado(data.estado) : null;
          const nextEstado = mapped ?? r.estado;
          const nextEnviado = data.enviado ?? r.enviado ?? false;
          if (nextEstado !== r.estado || nextEnviado !== (r.enviado ?? false)) {
            const updated = { ...r, estado: nextEstado, enviado: nextEnviado };
            await putRegistro(updated); // persiste en IndexedDB
            changed = true;
            return updated;
          }
        } catch {
          /* offline / server down — conserva el estado local */
        }
        return r;
      }),
    );
    setItems((prev) => {
      if (!prev) return next; // primera carga
      if (!changed && prev.length === next.length) return prev; // sin cambios: evita re-render
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void reconcile();
    };
    run();
    const t = setInterval(run, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [reconcile]);

  const confirmTarget = items?.find((r) => r.id === confirmId) ?? null;

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      // Borrado en servidor (SQLite + audio + docx) — idempotente.
      await fetch(`/api/informe/${confirmId}`, { method: "DELETE" }).catch(() => {});
      // Borrado local (IndexedDB).
      await deleteRegistro(confirmId);
      setItems((prev) => (prev ? prev.filter((r) => r.id !== confirmId) : prev));
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  }

  async function reintentar(id: string) {
    setReintentando(id);
    setReintentoMsg(null);
    try {
      const res = await fetch(`/api/informe/${id}/reprocesar`, { method: "POST" });
      if (res.ok) {
        setReintentoMsg({ id, msg: "Reprocesando…" });
        // Optimista: volver a "procesando" hasta que reconcile actualice.
        setItems((prev) =>
          prev ? prev.map((r) => (r.id === id ? { ...r, estado: "procesando" } : r)) : prev,
        );
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setReintentoMsg({ id, msg: d.error ?? `Error ${res.status}` });
      }
    } catch {
      setReintentoMsg({ id, msg: "No se pudo conectar." });
    } finally {
      setReintentando(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="anim-fade fixed top-0 w-full z-50 flex items-center gap-4 px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <button
          onClick={() => router.push("/")}
          aria-label="Inicio"
          className="p-2 -ml-2 hover:bg-surface-container-low rounded-full text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-on-surface">Mis registros</h1>
        <button
          onClick={() => router.push("/tablero")}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-caption text-caption">Coordinación</span>
        </button>
      </header>

      <main className="flex-grow pt-20 px-container-margin pb-12 max-w-xl mx-auto w-full">
        {items === null ? (
          <div className="flex justify-center pt-12">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">
              progress_activity
            </span>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-body-md text-on-surface-variant pt-12">
            Todavía no hay registros.
          </p>
        ) : (
          <ul className="stagger space-y-3">
            {items.map((r) => {
              return (
                <li
                  key={r.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      router.push(r.estado === "listo" ? `/informe/${r.id}/preview` : `/estado/${r.id}`)
                    }
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {r.titular}
                      </p>
                      <p className="font-caption text-caption text-on-surface-variant">
                        {r.programa ? `${programaLabel(r.programa)} · ` : ""}
                        {fmtFecha(r.createdAt)}
                      </p>
                    </div>
                    <StatusChip estado={chipDe(r)} />
                  </button>

                  {/* Barra de acciones: acción contextual (izq) + borrar (der). */}
                  <div className="flex items-center gap-1 border-t border-outline-variant px-2 py-1.5">
                    {r.estado === "error" && (
                      <button
                        onClick={() => reintentar(r.id)}
                        disabled={reintentando === r.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-primary disabled:opacity-40 transition-colors"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${reintentando === r.id ? "animate-spin" : ""}`}
                        >
                          {reintentando === r.id ? "progress_activity" : "refresh"}
                        </span>
                        <span className="font-caption text-caption">Reintentar</span>
                      </button>
                    )}
                    {reintentoMsg?.id === r.id && (
                      <span className="font-caption text-caption text-on-surface-variant">
                        {reintentoMsg.msg}
                      </span>
                    )}
                    <button
                      onClick={() => setConfirmId(r.id)}
                      title="Borrar"
                      aria-label="Borrar registro"
                      className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg hover:bg-error-container text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Modal de confirmación de borrado */}
      {confirmId && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 anim-fade">
          <div className="anim-enter w-full max-w-sm m-4 bg-surface-container-lowest rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-stack-sm">
              <div className="w-11 h-11 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error">delete_forever</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Borrar registro
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-1">
              {confirmTarget ? `"${confirmTarget.titular}"` : "Este registro"} se eliminará
              de forma permanente.
            </p>
            <p className="font-body-md text-body-md text-error font-semibold mb-stack-lg">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="flex-1 h-12 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-12 rounded-lg bg-error text-on-error font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {deleting ? (
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                )}
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
