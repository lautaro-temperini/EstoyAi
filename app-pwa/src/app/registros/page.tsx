"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listRegistros, type Registro, type RegistroEstado } from "@/lib/queue/db";

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

export default function RegistrosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Registro[] | null>(null);

  useEffect(() => {
    let active = true;
    listRegistros().then((r) => {
      if (active) setItems(r);
    });
    return () => {
      active = false;
    };
  }, []);

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
              return (
                <li key={r.id}>
                  <button
                    onClick={() => router.push(`/estado/${r.id}`)}
                    className="w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between gap-3 hover:border-primary transition-colors active:scale-[0.98]"
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
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
