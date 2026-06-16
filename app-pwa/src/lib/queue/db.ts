/**
 * Offline queue + registro index, both in IndexedDB on the promoter's device.
 *
 *  - `pending`   — audio waiting to upload. The Service Worker drains this when
 *                  the network returns (Background Sync) or when the page asks.
 *  - `registros` — one row per registro the promoter ever made, so they can
 *                  close the app and come back later to find the .docx. This is
 *                  the persistent link list shown on /registros.
 *
 * The registro `id` is generated on the device at capture time and travels with
 * the audio, so device → server → status screen all key on the same id.
 */

import type { Programa, TipoRegistro } from "@/lib/reports/schema";

const DB_NAME = "pp-registros";
const VERSION = 1;
const PENDING = "pending";
const REGISTROS = "registros";

/** UI/queue state of a registro, from capture to downloadable .docx. */
export type RegistroEstado =
  | "encolado" // saved on device, not yet sent
  | "subiendo" // upload in flight
  | "procesando" // server has the audio, whisper+LLM running
  | "listo" // .docx ready to download
  | "error"; // upload or processing failed

export interface Beneficiario {
  nombre: string;
  apellido: string;
  dni: string;
}

/** Audio + context queued for upload. */
export interface PendingUpload {
  id: string;
  wavBlob: Blob;
  filename: string;
  tipo: TipoRegistro | null;
  beneficiario: Beneficiario | null;
  programa: Programa | null;
  profesional: string | null;
  capturedAt: number;
  durationMs: number | null;
  intentos: number;
  ultimoError: string | null;
  createdAt: number;
}

/** Lightweight index row for the persistent "mis registros" list. */
export interface Registro {
  id: string;
  titular: string;
  tipo: TipoRegistro | null;
  programa: Programa | null;
  estado: RegistroEstado;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING)) {
        db.createObjectStore(PENDING, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(REGISTROS)) {
        const s = db.createObjectStore(REGISTROS, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const req = fn(transaction.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

// ── pending uploads ──────────────────────────────────────────────────────
export async function putPending(p: PendingUpload): Promise<void> {
  await tx(PENDING, "readwrite", (s) => s.put(p));
}

export async function getAllPending(): Promise<PendingUpload[]> {
  return tx<PendingUpload[]>(PENDING, "readonly", (s) => s.getAll());
}

export async function deletePending(id: string): Promise<void> {
  await tx(PENDING, "readwrite", (s) => s.delete(id));
}

// ── registros index ──────────────────────────────────────────────────────
export async function putRegistro(r: Registro): Promise<void> {
  await tx(REGISTROS, "readwrite", (s) => s.put(r));
}

export async function getRegistro(id: string): Promise<Registro | null> {
  const r = await tx<Registro | undefined>(REGISTROS, "readonly", (s) => s.get(id));
  return r ?? null;
}

export async function listRegistros(): Promise<Registro[]> {
  const all = await tx<Registro[]>(REGISTROS, "readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateRegistroEstado(
  id: string,
  estado: RegistroEstado,
): Promise<void> {
  const existing = await getRegistro(id);
  if (!existing) return;
  await putRegistro({ ...existing, estado });
}

/** Permanently remove a registro from both the index and the upload queue. */
export async function deleteRegistro(id: string): Promise<void> {
  await tx(REGISTROS, "readwrite", (s) => s.delete(id));
  await tx(PENDING, "readwrite", (s) => s.delete(id));
}
