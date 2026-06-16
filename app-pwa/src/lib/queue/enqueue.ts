"use client";

/**
 * Capture-side queue API. The recorder hands a WAV here; this saves it to
 * IndexedDB (so it survives offline / app close) and asks for an upload.
 *
 * Upload itself is owned by the Service Worker (see public/sw.js) so it can run
 * even with the app closed via Background Sync. When no SW controls the page
 * (dev, first load, or unsupported browser) we fall back to uploading straight
 * from the page with the exact same request shape.
 */

import {
  putPending,
  putRegistro,
  getAllPending,
  deletePending,
  updateRegistroEstado,
  type Beneficiario,
  type PendingUpload,
} from "./db";
import type { Programa, TipoRegistro } from "@/lib/reports/schema";

export const SYNC_TAG = "upload-audio";

interface EnqueueInput {
  wavBlob: Blob;
  durationMs: number | null;
  tipo: TipoRegistro | null;
  beneficiario: Beneficiario | null;
  programa: Programa | null;
  profesional: string | null;
}

function titularOf(tipo: TipoRegistro | null, b: Beneficiario | null): string {
  if (b?.apellido && b?.nombre) return `${b.apellido} ${b.nombre}`;
  if (b?.nombre) return b.nombre;
  return tipo === "grupal" ? "Actividad grupal" : "Beneficiario";
}

/** Save the recording to the queue and trigger an upload. Returns the registro id. */
export async function enqueueRegistro(input: EnqueueInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const pending: PendingUpload = {
    id,
    wavBlob: input.wavBlob,
    filename: `registro-${id}.wav`,
    tipo: input.tipo,
    beneficiario: input.beneficiario,
    programa: input.programa,
    profesional: input.profesional,
    capturedAt: now,
    durationMs: input.durationMs,
    intentos: 0,
    ultimoError: null,
    createdAt: now,
  };

  await putPending(pending);
  await putRegistro({
    id,
    titular: titularOf(input.tipo, input.beneficiario),
    tipo: input.tipo,
    programa: input.programa,
    estado: "encolado",
    createdAt: now,
  });

  void requestFlush();
  return id;
}

/** Ask the queue to drain. SW path if it controls us, else upload from page. */
export async function requestFlush(): Promise<void> {
  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
  if (sw?.controller) {
    // Un solo mecanismo por vez: Background Sync ya sube inmediatamente si hay
    // conexión (y reintenta solo si no). Sumarle el flush por postMessage hacía
    // dos subidas en paralelo del mismo audio → ejecución duplicada en n8n.
    try {
      const reg = await sw.ready;
      const sync = (reg as unknown as { sync?: { register(tag: string): Promise<void> } }).sync;
      if (sync) {
        await sync.register(SYNC_TAG);
        return;
      }
    } catch {
      /* Background Sync no soportado — cae al flush por mensaje. */
    }
    sw.controller.postMessage({ type: "flush" });
    return;
  }
  await clientFlush();
}

/** Page-side fallback uploader (mirrors the SW routine). */
async function clientFlush(): Promise<void> {
  const items = await getAllPending();
  for (const p of items) {
    await uploadOne(p);
  }
}

async function uploadOne(p: PendingUpload): Promise<void> {
  await updateRegistroEstado(p.id, "procesando");
  try {
    const form = new FormData();
    form.append("audio", p.wavBlob, p.filename);
    form.append(
      "meta",
      JSON.stringify({
        id: p.id,
        tipo: p.tipo,
        beneficiario: p.beneficiario,
        programa: p.programa,
        profesional: p.profesional,
        capturedAt: p.capturedAt,
        durationMs: p.durationMs,
      }),
    );
    const res = await fetch("/api/audio", { method: "POST", body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await deletePending(p.id);
    await updateRegistroEstado(p.id, "procesando");
  } catch (e) {
    await putPending({
      ...p,
      intentos: p.intentos + 1,
      ultimoError: e instanceof Error ? e.message : String(e),
    });
    await updateRegistroEstado(p.id, "error");
  }
}
