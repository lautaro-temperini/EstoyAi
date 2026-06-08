"use client";

import { createContext, createElement, useContext, useEffect, useState } from "react";

/**
 * Inference mode for the field device.
 *
 *  - "online"  → remote QVAC on Railway via the `/api/qvac` proxy. Needs network,
 *                no on-device weights, lighter device requirements.
 *  - "offline" → in-browser inference (transformers.js) that runs entirely on the
 *                field phone with weights cached locally. Works with no network
 *                once the model is downloaded. Heavier (see the RAM note).
 *
 * QVAC/@repo/qvacs cannot back the offline path: it needs the native `bare`
 * runtime and cannot run in a mobile browser. So offline uses transformers.js
 * (see lib/inference/offline-engine.ts); qvacs stays the online backend.
 */
export type InferenceMode = "online" | "offline";

const KEY = "ngo-inference-mode";
const DEFAULT: InferenceMode = "online";

export function getStoredMode(): InferenceMode {
  if (typeof window === "undefined") return DEFAULT;
  const v = window.localStorage.getItem(KEY);
  return v === "online" || v === "offline" ? v : DEFAULT;
}

interface ModeContextValue {
  mode: InferenceMode;
  setMode: (m: InferenceMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function InferenceModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<InferenceMode>(DEFAULT);

  // Hydrate the persisted preference after mount (avoids SSR mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(getStoredMode());
  }, []);

  const setMode = (m: InferenceMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };

  return createElement(ModeContext.Provider, { value: { mode, setMode } }, children);
}

export function useInferenceMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useInferenceMode must be used within InferenceModeProvider");
  return ctx;
}
