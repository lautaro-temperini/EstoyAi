import "server-only";

import {
  startQVACProvider,
  stopQVACProvider,
  transcribe,
  completion,
} from "@qvac/sdk";

// Re-export the full SDK surface so callers can reach anything via
// `@repo/qvacs` without taking a direct dependency on `@qvac/sdk`.
export * from "@qvac/sdk";

/**
 * QVAC is an on-device inference runtime: it spins up a worker (the
 * "provider"), into which models are loaded once and then reused. This wrapper
 * keeps a single provider and a model cache alive across requests so a
 * push-to-talk request doesn't pay startup/load cost every call.
 *
 * Server-only — the worker uses native addons and must run in the Node runtime.
 */

let providerPromise: ReturnType<typeof startQVACProvider> | null = null;
const models = new Map<string, Promise<string>>();

/** Start the QVAC provider once and reuse it (idempotent). */
export function getProvider() {
  providerPromise ??= startQVACProvider();
  return providerPromise;
}

/** Stop the provider and forget every cached model. */
export async function stopProvider(): Promise<void> {
  if (!providerPromise) return;
  await stopQVACProvider();
  providerPromise = null;
  models.clear();
}

/**
 * Load a model once per `key` and reuse the resulting modelId. The provider is
 * started first, then `load` runs (call `loadModel` inside it so its overloads
 * resolve at the call site), e.g.
 *
 * ```ts
 * const id = await getModel("whisper", () =>
 *   loadModel({ modelSrc: WHISPER_EN_BASE_Q8_0 }),
 * );
 * ```
 */
export function getModel(
  key: string,
  load: () => Promise<string>,
): Promise<string> {
  let pending = models.get(key);
  if (!pending) {
    pending = getProvider()
      .then(load)
      .catch((err) => {
        models.delete(key);
        throw err;
      });
    models.set(key, pending);
  }
  return pending;
}

/** Transcribe a single audio buffer with an already-loaded transcription model. */
export function transcribeOnce(
  modelId: string,
  audioChunk: string | Buffer,
): Promise<string> {
  return transcribe({ modelId, audioChunk });
}

/** Run a completion and resolve to its aggregated text. */
export function completeText(
  params: Parameters<typeof completion>[0],
): Promise<string> {
  return completion(params).text;
}

export interface CompleteMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Run a completion constrained to a JSON Schema and resolve to the parsed
 * object. The model output is grammar-constrained (`responseFormat:
 * json_schema`), so even a small local model returns schema-valid JSON — the
 * reliable path for structured extraction. Throws if the output fails to parse.
 */
export async function completeJSON<T = unknown>(
  modelId: string,
  history: CompleteMessage[],
  schema: Record<string, unknown>,
  schemaName = "result",
): Promise<T> {
  const run = completion({
    modelId,
    history,
    stream: true,
    responseFormat: {
      type: "json_schema",
      json_schema: { name: schemaName, schema },
    },
  });
  const final = await run.final;
  const text = (final.contentText ?? "").trim();
  return JSON.parse(text) as T;
}
