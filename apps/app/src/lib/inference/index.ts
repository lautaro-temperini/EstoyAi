"use client";

import type { InferenceMode } from "./mode";
import type { ReportExtraction } from "@/lib/reports/schema";
import {
  transcribe,
  chatJSON,
  localTarget,
  remoteTarget,
  type ChatMessage,
  type QvacTarget,
} from "@/lib/qvac/client";
import { getStoredLevel, LEVEL_MODEL } from "@/lib/llm-level";
import { transcribeOffline, extractOffline } from "./offline-engine";

/**
 * Routes inference to the right backend for the chosen mode, using the model
 * ids the resolved target actually serves:
 *
 *  - "online"  → remote proxy upstream (ngrok tunnel / Railway).
 *  - "offline" → local `qvac serve` if it can do the job (Whisper + LLM), else
 *                the in-browser transformers.js fallback (a PWA on a plain
 *                phone still works fully offline).
 */
export type Backend = "remote" | "local" | "browser";

/** Resolve the QVAC target for a mode, or null when offline must use the browser. */
async function targetFor(mode: InferenceMode): Promise<QvacTarget | null> {
  if (mode === "online") return remoteTarget();
  return localTarget(); // local serve if usable, else null → in-browser
}

/** LLM id: honor the operator's level locally when present, else the target's. */
function pickLlm(t: QvacTarget): string {
  const want = LEVEL_MODEL[getStoredLevel()];
  return t.where === "local" && t.available.includes(want) ? want : t.llmModel;
}

export async function inferTranscribe(
  mode: InferenceMode,
  blob: Blob,
  opts: { language?: string; filename?: string },
): Promise<string> {
  const t = await targetFor(mode);
  if (!t) return transcribeOffline(blob, { language: opts.language });
  return transcribe(blob, { model: t.asrModel, language: opts.language, filename: opts.filename }, t);
}

export async function inferExtract(
  mode: InferenceMode,
  messages: ChatMessage[],
  schema: Record<string, unknown>,
): Promise<ReportExtraction> {
  const t = await targetFor(mode);
  if (!t) return extractOffline(messages, schema);
  return chatJSON<ReportExtraction>(messages, schema, { model: pickLlm(t), schemaName: "informe" }, t);
}
