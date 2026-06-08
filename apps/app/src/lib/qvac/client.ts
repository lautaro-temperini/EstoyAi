"use client";

/**
 * Browser-side QVAC client. Talks to an OpenAI-compatible `qvac serve openai`
 * endpoint — NOT @qvac/sdk (which needs the native bare runtime and can't run
 * on Vercel). Resolution prioritizes the operator's own device:
 *
 *   1. Local `qvac serve` (NEXT_PUBLIC_QVAC_LOCAL_URL, default localhost:11434)
 *      — true offline-first, runs on the field device. http://localhost is a
 *      "potentially trustworthy" origin so HTTPS pages may call it (Chrome).
 *   2. Fallback to `/api/qvac` — a same-origin Vercel proxy that forwards to the
 *      configured upstream (ngrok tunnel to a Mac, else Railway). Never fails.
 *
 * Detection is capability-based: a real local QVAC serve exposes a Whisper
 * model AND an LLM (which an unrelated server on :11434 like Ollama does not),
 * and we request the model ids the server REPORTS — so it works regardless of
 * how the operator named/started it.
 */

const LOCAL_URL =
  process.env.NEXT_PUBLIC_QVAC_LOCAL_URL?.replace(/\/$/, "") ?? "http://localhost:11434";
const LOCAL_KEY = process.env.NEXT_PUBLIC_QVAC_LOCAL_KEY;
const PROXY_BASE = "/api/qvac";
const PROBE_TIMEOUT_MS = 1500;

// Fallback model ids for the proxy upstream (we control it, so the aliases are
// known). On a shared CPU box use the lighter LLM.
const REMOTE_ASR_MODEL = process.env.NEXT_PUBLIC_QVAC_ASR_MODEL ?? "whisper-base";
const REMOTE_LLM_MODEL = process.env.NEXT_PUBLIC_QVAC_REMOTE_LLM ?? "llama-1b";

const isWhisper = (id: string) => /whisper/i.test(id);

export interface QvacTarget {
  base: string;
  key?: string;
  /** "local" (operator device) or "remote" (proxy upstream: ngrok/Railway). */
  where: "local" | "remote";
  /** Transcription model id to request on this target. */
  asrModel: string;
  /** Default LLM model id to request on this target. */
  llmModel: string;
  /** Model ids the target actually serves (local only; used to honor the level). */
  available: string[];
}

let resolved: Promise<QvacTarget> | null = null;
let modelsCache: { at: number; ids: string[] | null } | null = null;

/** List the model ids a local `qvac serve` exposes, or null if unreachable. */
async function localModels(ttlMs = 4000): Promise<string[] | null> {
  if (modelsCache && Date.now() - modelsCache.at < ttlMs) return modelsCache.ids;
  let ids: string[] | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${LOCAL_URL}/v1/models`, {
      signal: ctrl.signal,
      headers: LOCAL_KEY ? { Authorization: `Bearer ${LOCAL_KEY}` } : undefined,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id?: string }> };
      ids = (data.data ?? []).map((m) => m.id).filter((id): id is string => !!id);
    }
  } catch {
    ids = null;
  }
  modelsCache = { at: Date.now(), ids };
  return ids;
}

/** The remote proxy target (ngrok tunnel / Railway via the same-origin proxy). */
export function remoteTarget(): QvacTarget {
  return {
    base: PROXY_BASE,
    where: "remote",
    asrModel: REMOTE_ASR_MODEL,
    llmModel: REMOTE_LLM_MODEL,
    available: [],
  };
}

/**
 * The local `qvac serve` target if one is reachable AND can do the job (serves
 * a Whisper model + an LLM), else null. Uses the ids the server reports.
 */
export async function localTarget(force = false): Promise<QvacTarget | null> {
  const ids = await localModels(force ? 0 : undefined);
  if (!ids) return null;
  const asr = ids.find(isWhisper);
  const llm = ids.find((id) => !isWhisper(id));
  if (!asr || !llm) return null;
  return { base: LOCAL_URL, key: LOCAL_KEY, where: "local", asrModel: asr, llmModel: llm, available: ids };
}

/** Resolve the inference target once per session (local device, else proxy). */
export function resolveTarget(force = false): Promise<QvacTarget> {
  if (resolved && !force) return resolved;
  resolved = (async () => {
    const local = await localTarget(force);
    if (local) {
      console.log("[qvac] using LOCAL device:", LOCAL_URL, { asr: local.asrModel, llm: local.llmModel });
      return local;
    }
    console.log("[qvac] local unavailable → using proxy upstream via", PROXY_BASE);
    return remoteTarget();
  })();
  return resolved;
}

function authHeaders(t: QvacTarget): Record<string, string> {
  // The proxy injects the upstream key server-side, so we only send a key when
  // calling a local server that was started with --api-key.
  return t.key ? { Authorization: `Bearer ${t.key}` } : {};
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Speech-to-text via POST /v1/audio/transcriptions (OpenAI multipart). */
export async function transcribe(
  blob: Blob,
  opts: { model: string; language?: string; filename?: string },
  target?: QvacTarget,
): Promise<string> {
  const t = target ?? (await resolveTarget());
  const form = new FormData();
  form.append("file", blob, opts.filename ?? "registro.wav");
  form.append("model", opts.model);
  if (opts.language) form.append("language", opts.language);

  const res = await fetch(`${t.base}/v1/audio/transcriptions`, {
    method: "POST",
    headers: authHeaders(t),
    body: form,
  });
  if (!res.ok) {
    throw new Error(`transcriptions ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/**
 * Chat completion constrained to a JSON schema via POST /v1/chat/completions.
 * Returns the parsed object. Tolerates servers that don't honor json_schema by
 * extracting the first JSON object from the content.
 */
export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  schema: Record<string, unknown>,
  opts: { model: string; schemaName?: string },
  target?: QvacTarget,
): Promise<T> {
  const t = target ?? (await resolveTarget());
  const res = await fetch(`${t.base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(t) },
    body: JSON.stringify({
      model: opts.model,
      messages,
      stream: false,
      // The structured report is short; cap generation so CPU-bound upstreams
      // (Railway) can't run long. Bounds worst-case latency.
      max_tokens: 512,
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName ?? "result", schema, strict: true },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`chat/completions ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseJson<T>(content);
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
