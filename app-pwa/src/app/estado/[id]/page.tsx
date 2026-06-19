"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRegistro,
  updateRegistroEstado,
  type RegistroEstado,
} from "@/lib/queue/db";
import { requestFlush } from "@/lib/queue/enqueue";
import { IS_DEV, devEstado } from "@/lib/dev-mock";

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

const VIEW: Record<RegistroEstado, { icon: string; label: string; sub: string; spin?: boolean }> = {
  encolado: {
    icon: "save",
    label: "Guardado en este dispositivo",
    sub: "",
  },
  procesando: {
    icon: "neurology",
    label: "En el servidor, generando informe",
    sub: "La sede está transcribiendo y generando el informe…",
    spin: true,
  },
  listo: { icon: "check_circle", label: "Informe listo", sub: "Ya podés descargar el documento." },
  error: { icon: "error", label: "Falló el envío", sub: "Podés reintentar la subida." },
};

const TERMINAL: RegistroEstado[] = ["listo"];

export default function EstadoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [estado, setEstado] = useState<RegistroEstado | null>(null);
  const [titular, setTitular] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load the registro row from IndexedDB (survives app close / refresh).
  useEffect(() => {
    let active = true;
    (async () => {
      const r = await getRegistro(id);
      if (!active) return;
      if (r) {
        setEstado(r.estado);
        setTitular(r.titular);
      } else if (IS_DEV) {
        const m = devEstado(id); // dev: ver UI con ids mock (r1, r2…)
        setEstado(m.estado);
        setTitular(m.titular);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Live updates pushed by the Service Worker during upload.
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "progress" && d.id === id) setEstado(d.estado as RegistroEstado);
    };
    sw.addEventListener("message", onMsg);
    return () => sw.removeEventListener("message", onMsg);
  }, [id]);

  // Poll the server for processing progress until the .docx is ready.
  useEffect(() => {
    if (estado && TERMINAL.includes(estado)) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/informe/${id}`, { cache: "no-store" });
        if (!res.ok) return; // server doesn't have it yet — keep current estado
        const data = (await res.json()) as { estado?: string };
        const mapped = data.estado ? mapServerEstado(data.estado) : null;
        if (mapped && active) {
          setEstado(mapped);
          await updateRegistroEstado(id, mapped);
        }
      } catch {
        /* offline / server down — keep current estado */
      }
    };
    const t = setInterval(tick, 4000);
    void tick();
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id, estado]);

  const reintentar = useCallback(async () => {
    setEstado("encolado");
    await updateRegistroEstado(id, "encolado");
    await requestFlush();
  }, [id]);

  // Cuando el informe queda listo, llevar directo a la Vista del informe.
  // La antigua pantalla "listo" (descargar/editar) quedó obsoleta.
  useEffect(() => {
    if (estado === "listo") router.replace(`/informe/${id}/preview`);
  }, [estado, id, router]);

  // En "listo" no mostramos nada: redirigimos a la vista del informe.
  if (loading || estado === "listo") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const v = estado ? VIEW[estado] : null;

  // Estado "en el dispositivo": audio guardado localmente, sin conexión.
  const isOffline = estado === "encolado";

  const iconColor =
    estado === "error" ? "text-error" : isOffline ? "text-secondary" : "text-primary";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <button
          onClick={() => router.push("/")}
          aria-label="Inicio"
          className="p-2 -ml-2 hover:bg-surface-container-low rounded-full text-primary"
        >
          <span className="material-symbols-outlined">home</span>
        </button>
        <button
          onClick={() => router.push("/registros")}
          className="font-label-md text-label-md text-primary px-3 py-2 rounded-lg hover:bg-primary/10"
        >
          Mis registros
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-container-margin pt-20 pb-12 text-center">
        {!v ? (
          <p className="font-headline-sm text-headline-sm text-on-surface">Registro no encontrado.</p>
        ) : (
          <div className="anim-enter w-full max-w-md flex flex-col items-center gap-stack-md">
            {titular && (
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                {titular}
              </p>
            )}

            <span
              className={`material-symbols-outlined text-[72px] ${iconColor} ${v.spin ? "animate-spin" : ""}`}
            >
              {v.icon}
            </span>

            <h1 className="font-headline-md text-headline-md text-on-surface">{v.label}</h1>

            {/* ── Guardado en dispositivo (encolado) ────────────────────────── */}
            {isOffline && (
              <div className="w-full bg-secondary-container/30 border border-secondary/20 rounded-xl p-4 text-left">
                <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                  Tu audio está guardado en este dispositivo y se enviará automáticamente cuando haya conexión. Podés cerrar la app — cuando esté listo vas a encontrar el informe en{" "}
                  <button
                    onClick={() => router.push("/registros")}
                    className="font-semibold underline underline-offset-2 text-primary"
                  >
                    Mis registros
                  </button>
                  .
                </p>
                <p className="font-caption text-caption text-on-surface-variant mt-3">
                  Si recuperaste señal y el estado no avanzó, reabrí la app.
                </p>
              </div>
            )}

            {/* ── En el servidor (procesando) ───────────────────────────────── */}
            {estado === "procesando" && (
              <>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">{v.sub}</p>
                <p className="font-caption text-caption text-on-surface-variant mt-stack-sm">
                  Podés cerrar la app. El registro queda guardado y lo vas a encontrar en &quot;Mis registros&quot;.
                </p>
              </>
            )}

            {/* ── Error ────────────────────────────────────────────────────── */}
            {estado === "error" && (
              <>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">{v.sub}</p>
                <button
                  onClick={reintentar}
                  className="mt-stack-md h-14 px-8 bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Reintentar subida
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
