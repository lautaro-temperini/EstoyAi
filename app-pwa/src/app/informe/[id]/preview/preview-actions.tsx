"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Botón volver del preview (usa el historial, así respeta de dónde viniste). */
export function PreviewBack() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Volver"
      className="p-2 -ml-2 hover:bg-surface-container-low rounded-full text-primary"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}

/**
 * Acciones del preview, según el estado:
 *  - borrador (no enviado): Editar + Enviar a coordinación.
 *  - en coordinación (enviado): solo Editar.
 */
export function PreviewActions({ id, enviado }: { id: string; enviado: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/informe/${id}/enviar`, { method: "POST" });
      if (res.ok) {
        router.push("/registros");
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? `Error ${res.status}`);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed bottom-0 w-full bg-surface border-t border-outline-variant px-container-margin py-3 max-w-2xl mx-auto left-0 right-0">
      {error && <p className="font-caption text-caption text-error mb-2">{error}</p>}
      <div className="flex gap-3">
        <Link
          href={`/informe/${id}`}
          className={`h-14 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform ${
            enviado
              ? "flex-1 bg-primary text-on-primary"
              : "px-4 bg-surface-container-low border border-outline-variant text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          Editar
        </Link>
        {!enviado && (
          <button
            onClick={enviar}
            disabled={enviando}
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
