"use client";

import { useInferenceMode } from "@/lib/inference/mode";

/**
 * Online / Offline switch, fixed top-right (where the dev tools sit). Persists
 * the operator's choice. Offline auto-prefers a local `qvac serve`, else falls
 * back to in-browser inference — see lib/inference.
 */
export function ModeToggle() {
  const { mode, setMode } = useInferenceMode();
  const online = mode === "online";

  return (
    <div
      role="group"
      aria-label="Modo de inferencia"
      className="anim-fade fixed top-2 right-2 z-[60] flex items-center gap-0.5 rounded-full border border-outline-variant bg-surface-container-lowest/90 p-0.5 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setMode("online")}
        aria-pressed={online}
        className={`flex h-8 items-center gap-1 rounded-full px-2.5 font-label-md text-label-md transition-colors ${
          online ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">cloud</span>
        Online
      </button>
      <button
        type="button"
        onClick={() => setMode("offline")}
        aria-pressed={!online}
        className={`flex h-8 items-center gap-1 rounded-full px-2.5 font-label-md text-label-md transition-colors ${
          !online ? "bg-secondary text-on-secondary" : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">cloud_off</span>
        Offline
      </button>
    </div>
  );
}
