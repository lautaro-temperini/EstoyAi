"use client";

import { useLlmLevel, type LlmLevel } from "@/lib/llm-level";

/**
 * Dev-only inference config — choose the on-device LLM ("nivel de
 * razonamiento"). Only rendered in development; production always uses the
 * lighter model (enforced server-side).
 */
export function LlmConfig() {
  const [level, setLevel] = useLlmLevel();

  return (
    <label
      className="flex items-center gap-1.5 text-on-surface-variant"
      title="Solo en desarrollo — elige el modelo de inferencia local"
    >
      <span className="material-symbols-outlined text-[18px]">tune</span>
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as LlmLevel)}
        aria-label="Nivel de razonamiento del modelo"
        className="bg-surface-container-low border border-outline-variant rounded-lg px-2 py-1 font-label-md text-label-md text-on-surface focus:border-primary outline-none"
      >
        <option value="alta">Razonamiento Alto</option>
        <option value="media">Razonamiento Medio</option>
      </select>
    </label>
  );
}
