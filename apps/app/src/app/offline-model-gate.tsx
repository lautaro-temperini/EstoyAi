"use client";

import { useEffect, useState } from "react";
import { useInferenceMode } from "@/lib/inference/mode";
import { localTarget } from "@/lib/qvac/client";
import {
  ensureModels,
  isOfflineReady,
  type DownloadProgress,
} from "@/lib/inference/offline-engine";

type Phase = "checking" | "passthrough" | "need-download" | "downloading" | "error";

/**
 * Gates the offline experience. In offline mode:
 *  - if a local `qvac serve` is reachable → pass straight through (it serves the
 *    models, top quality, no in-browser download needed);
 *  - else, if the in-browser models aren't downloaded yet → show the download
 *    empty-state. Once the download finishes, it flips to the SAME UI
 *    automatically — there is no extra confirmation step.
 * In online mode it's a no-op.
 */
export function OfflineModelGate({ children }: { children: React.ReactNode }) {
  const { mode } = useInferenceMode();
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState<DownloadProgress>({ status: "idle", pct: 0 });

  useEffect(() => {
    if (mode !== "offline") return; // online → render passes through below
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("checking");
    (async () => {
      // Prefer a local qvac serve (best quality, uses qvacs). It manages its own
      // model cache, so no in-browser download is needed.
      const localUp = (await localTarget()) !== null;
      const ready = localUp || (await isOfflineReady());
      if (!active) return;
      setPhase(ready ? "passthrough" : "need-download");
    })();
    return () => {
      active = false;
    };
  }, [mode]);

  const download = async () => {
    setPhase("downloading");
    try {
      await ensureModels((p) => setProgress(p));
      setPhase("passthrough"); // auto-continues to the same UI — no extra step
    } catch {
      setPhase("error");
    }
  };

  if (mode !== "offline" || phase === "passthrough") return <>{children}</>;

  if (phase === "checking") {
    return (
      <main className="flex-grow flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
          progress_activity
        </span>
      </main>
    );
  }

  const downloading = phase === "downloading";
  const failed = phase === "error";

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-container-margin pt-20 pb-24">
      <div className="anim-enter w-full max-w-md flex flex-col items-center text-center gap-stack-md">
        <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-[32px]">
            {failed ? "error" : "cloud_download"}
          </span>
        </div>

        <h1 className="font-headline-md text-headline-md text-on-surface">
          Usar sin conexión
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Para trabajar sin red, este dispositivo necesita descargar el modelo de
          voz una sola vez. Después funciona completamente offline.
        </p>

        {/* RAM recommendation (verbatim per product). */}
        <p className="font-caption text-caption text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2">
          Para el modo online se recomienda tener 4 GB de RAM, con 2 GB de RAM es
          suficiente.
        </p>

        {downloading ? (
          <div className="w-full flex flex-col gap-2" aria-live="polite">
            <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="font-caption text-caption text-on-surface-variant">
              Descargando modelo… {progress.pct}%
              {progress.file ? ` · ${progress.file}` : ""}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={download}
            className="w-full h-14 bg-secondary text-on-secondary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">download</span>
            {failed ? "Reintentar descarga" : "Descargar modelo"}
          </button>
        )}

        {failed && progress.error && (
          <p className="text-error font-caption text-caption">{progress.error}</p>
        )}

        {/* Higher-quality path: run qvac serve locally on a capable device. */}
        <p className="font-caption text-caption text-on-surface-variant border-t border-outline-variant/40 pt-3 mt-1">
          ¿Mejor calidad? Corré <code className="font-mono">qvac serve</code> en
          este dispositivo. Instalar qvacs en el device no es overkill — es
          literalmente el diseño offline de QVAC.
        </p>
      </div>
    </main>
  );
}
