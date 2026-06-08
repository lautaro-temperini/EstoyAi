"use client";

import type { ChatMessage } from "@/lib/qvac/client";
import type { ReportExtraction } from "@/lib/reports/schema";

/**
 * In-browser offline inference (transformers.js).
 *
 * This is the offline FALLBACK used only when no local `qvac serve` is reachable
 * (see lib/inference). It runs entirely inside the field phone's browser —
 * weights download once to the browser Cache, then it works with no network.
 *
 * It mirrors everything the qvac path does: speech-to-text (Whisper) AND the
 * structured report extraction (a small instruct LLM). Quality is lower than the
 * qvac models and it's heavier on the device CPU — see the RAM note in the UI.
 * QVAC/@repo/qvacs cannot back this path: it needs the native `bare` runtime,
 * which a browser can't load. For top quality, run `qvac serve` locally instead.
 */

// transformers.js-compatible ONNX models, sized to run on a phone.
export const OFFLINE_ASR_MODEL =
  process.env.NEXT_PUBLIC_OFFLINE_ASR_MODEL ?? "Xenova/whisper-base";
export const OFFLINE_LLM_MODEL =
  process.env.NEXT_PUBLIC_OFFLINE_LLM_MODEL ?? "onnx-community/Qwen2.5-0.5B-Instruct";

const READY_KEY = "ngo-offline-models-ready";

// Whisper wants the language as an English name, not an ISO code.
const WHISPER_LANG: Record<string, string> = {
  es: "spanish",
  en: "english",
  fr: "french",
  ar: "arabic",
  sw: "swahili",
};

export type DownloadStatus = "idle" | "downloading" | "ready" | "error";

export interface DownloadProgress {
  status: DownloadStatus;
  /** Aggregate 0..100 across every model file. */
  pct: number;
  /** File currently downloading (for the status line). */
  file?: string;
  error?: string;
}

type ProgressCb = (p: DownloadProgress) => void;

// transformers.js progress event (the subset we read).
interface TfProgress {
  status: string; // 'initiate' | 'download' | 'progress' | 'done'
  name?: string;
  file?: string;
  progress?: number; // 0..100
}

// Lazily-created singletons so the heavy library + weights load once per session.
let asrPipe: ((audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text?: string }>) | null = null;
let llmPipe:
  | ((messages: ChatMessage[], opts: Record<string, unknown>) => Promise<Array<{ generated_text: ChatMessage[] | string }>>)
  | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * True if the offline models are already usable in this browser — either the
 * ready-flag is set, OR the weights are still cached (detected in the
 * transformers.js Cache Storage even if the flag was lost). When detected we
 * re-set the flag so the next check is instant. This lets the flow continue
 * straight to recording instead of re-showing the download gate.
 */
export async function isOfflineReady(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(READY_KEY) === "1") return true;
  try {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open("transformers-cache");
    const reqs = await cache.keys();
    const cached = (id: string) => reqs.some((r) => r.url.includes(id));
    if (cached(OFFLINE_ASR_MODEL) && cached(OFFLINE_LLM_MODEL)) {
      markReady();
      return true;
    }
  } catch {
    /* Cache API unavailable -> treat as not-ready */
  }
  return false;
}

function markReady() {
  try {
    window.localStorage.setItem(READY_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Download (first run) + load both models. Idempotent: concurrent callers share
 * one load. `onProgress` reports the aggregate download percentage.
 */
export function ensureModels(onProgress?: ProgressCb): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const perFile = new Map<string, number>();
    const report = (status: DownloadStatus, file?: string, error?: string) => {
      const vals = [...perFile.values()];
      const pct = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      onProgress?.({ status, pct, file, error });
    };

    const progress_callback = (p: TfProgress) => {
      if (p.file) {
        perFile.set(p.file, p.status === "done" ? 100 : typeof p.progress === "number" ? p.progress : 0);
      }
      report("downloading", p.file);
    };

    try {
      onProgress?.({ status: "downloading", pct: 0 });
      const transformers = (await import("@huggingface/transformers")) as {
        pipeline: (task: string, model: string, opts: Record<string, unknown>) => Promise<unknown>;
        env: { allowLocalModels: boolean; useBrowserCache: boolean };
      };
      const { pipeline, env } = transformers;
      // CRITICAL: with allowLocalModels=true (the default), transformers.js
      // fetches `/models/<id>/...` from THIS Next origin first — which returns
      // the 404 HTML page, so the model load fails/stalls. Force the HF CDN and
      // cache the weights in the browser (Cache Storage) for true offline reuse.
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Whisper (speech-to-text) + small instruct LLM (structured extraction).
      asrPipe = (await pipeline("automatic-speech-recognition", OFFLINE_ASR_MODEL, {
        progress_callback,
        dtype: "q8",
      })) as typeof asrPipe;
      llmPipe = (await pipeline("text-generation", OFFLINE_LLM_MODEL, {
        progress_callback,
        dtype: "q4",
      })) as typeof llmPipe;

      markReady();
      onProgress?.({ status: "ready", pct: 100 });
    } catch (err) {
      loadPromise = null; // allow retry
      const message = err instanceof Error ? err.message : String(err);
      onProgress?.({ status: "error", pct: 0, error: message });
      throw err;
    }
  })();

  return loadPromise;
}

/** Speech-to-text, fully in-browser. */
export async function transcribeOffline(
  blob: Blob,
  opts: { language?: string },
): Promise<string> {
  await ensureModels();
  if (!asrPipe) throw new Error("ASR model not loaded");
  const audio = await decodeToMono16k(blob);
  const language = WHISPER_LANG[opts.language ?? "es"] ?? "spanish";
  const out = await asrPipe(audio, {
    language,
    task: "transcribe",
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  return (out.text ?? "").trim();
}

/**
 * Structured report extraction, fully in-browser. transformers.js has no
 * grammar/json_schema enforcement, so we steer the model with the schema's keys
 * and parse tolerantly (extract the first JSON object from the output).
 */
export async function extractOffline(
  messages: ChatMessage[],
  schema: Record<string, unknown>,
): Promise<ReportExtraction> {
  await ensureModels();
  if (!llmPipe) throw new Error("LLM not loaded");

  // Steer the small model toward the exact shape (no grammar enforcement here).
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  const keys = props ? Object.keys(props).join(", ") : "";
  const steered: ChatMessage[] = keys
    ? [
        ...messages,
        {
          role: "system",
          content: `Responde ÚNICAMENTE con un objeto JSON válido con estas claves: ${keys}. Sin texto adicional.`,
        },
      ]
    : messages;

  const out = await llmPipe(steered, {
    max_new_tokens: 512,
    do_sample: false,
    return_full_text: false,
  });
  const gen = out?.[0]?.generated_text;
  const content =
    typeof gen === "string" ? gen : (gen?.[gen.length - 1]?.content ?? "");
  return parseJson<ReportExtraction>(content);
}

/** Decode any recorded audio blob to mono Float32 at 16 kHz (Whisper input). */
async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const ch0 = decoded.getChannelData(0);
    if (decoded.sampleRate === 16000) return new Float32Array(ch0);
    return resampleLinear(ch0, decoded.sampleRate, 16000);
  } finally {
    void ctx.close();
  }
}

function resampleLinear(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j] ?? 0;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function parseJson<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`LLM did not return JSON: ${content.slice(0, 200)}`);
  }
}
