"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmEnviarModal } from "@/components/confirm-enviar-modal";

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
 * Acciones del preview, según contexto + estado:
 *  - Coordinación (ctx="coord", desde /tablero): solo Editar.
 *  - Promotor borrador (no enviado): Editar + Enviar a coordinación.
 *  - Promotor ya enviado: sin opciones (solo lectura) → no se renderiza barra.
 */
export function PreviewActions({
  id,
  enviado,
  ctx,
}: {
  id: string;
  enviado: boolean;
  ctx?: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const isCoord = ctx === "coord";
  // Promotor sobre un informe ya enviado: solo lectura, sin barra de acciones.
  if (!isCoord && enviado) return null;
  const showEnviar = !isCoord && !enviado;

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/informe/${id}/enviar`, { method: "POST" });
      if (res.ok) {
        setConfirm(false);
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
            showEnviar
              ? "px-4 bg-surface-container-low border border-outline-variant text-primary"
              : "flex-1 bg-primary text-on-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          Editar
        </Link>
        {showEnviar && (
          <button
            onClick={() => setConfirm(true)}
            disabled={enviando}
            className="flex-1 h-14 bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Enviar a coordinación
          </button>
        )}
      </div>

      <ConfirmEnviarModal
        open={confirm}
        enviando={enviando}
        onCancel={() => setConfirm(false)}
        onConfirm={enviar}
      />
    </div>
  );
}
