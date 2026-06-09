"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listRegistros, deleteRegistro, type Registro, type RegistroEstado } from "@/lib/queue/db";
import { CloudflareIcon, PodioIcon } from "@/components/brand-icons";

const BADGE: Record<RegistroEstado, { label: string; cls: string }> = {
  encolado: { label: "En cola", cls: "bg-surface-container-high text-on-surface-variant" },
  subiendo: { label: "Subiendo", cls: "bg-primary-container/20 text-primary" },
  procesando: { label: "Procesando", cls: "bg-tertiary-container text-on-tertiary-container" },
  listo: { label: "Listo", cls: "bg-secondary-container text-on-secondary-container" },
  error: { label: "Error", cls: "bg-error-container text-on-error-container" },
};

function fmtFecha(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type AccionPendiente = { id: string; accion: "r2" | "podio" } | null;
type Feedback = { id: string; ok: boolean; msg: string } | null;

export default function RegistrosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Registro[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<AccionPendiente>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let active = true;
    listRegistros().then((r) => {
      if (active) setItems(r);
    });
    return () => {
      active = false;
    };
  }, []);

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

  async function ejecutarAccion(id: string, accion: "r2" | "podio") {
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
              const b = BADGE[r.estado];
              const listo = r.estado === "listo";
              const isBusy = busy?.id === r.id;
              const fb = feedback?.id === r.id ? feedback : null;
              return (
                <li
                  key={r.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => router.push(`/estado/${r.id}`)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {r.titular}
                      </p>
                      <p className="font-caption text-caption text-on-surface-variant">
                        {fmtFecha(r.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-bold ${b.cls}`}>
                      {b.label}
                    </span>
                  </button>

                  {/* Barra de acciones */}
                  <div className="flex items-center gap-1 border-t border-outline-variant px-2 py-1.5">
                    <button
                      onClick={() => ejecutarAccion(r.id, "r2")}
                      disabled={!listo || isBusy}
                      title="Subir a Cloudflare"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy?.id === r.id && busy.accion === "r2" ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <CloudflareIcon className="shrink-0" />
                      )}
                      <span className="font-caption text-caption">Subir a Cloudflare</span>
                    </button>

                    <button
                      onClick={() => ejecutarAccion(r.id, "podio")}
                      disabled={!listo || isBusy}
                      title="Anexar con Podio"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy?.id === r.id && busy.accion === "podio" ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <PodioIcon className="shrink-0" />
                      )}
                      <span className="font-caption text-caption">Anexar con Podio</span>
                    </button>

                    <button
                      onClick={() => setConfirmId(r.id)}
                      title="Borrar"
                      className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg hover:bg-error-container text-error transition-colors"
                      aria-label="Borrar registro"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
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
