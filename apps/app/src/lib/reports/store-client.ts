"use client";

import type { Estado, FieldReport } from "./schema";

/**
 * Offline-first report store in IndexedDB (on the operator's device). Replaces
 * the old server-side JSON store — inference and storage are now fully
 * client-side so the app works offline and deploys to Vercel as a static PWA.
 */
const DB_NAME = "halketon-reports";
const STORE = "reports";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = fn(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function putReport(report: FieldReport): Promise<void> {
  await tx("readwrite", (s) => s.put(report));
}

export async function getReport(id: string): Promise<FieldReport | null> {
  const r = await tx<FieldReport | undefined>("readonly", (s) => s.get(id));
  return r ?? null;
}

/** All reports, newest first (chronological history). */
export async function listReports(): Promise<FieldReport[]> {
  const all = await tx<FieldReport[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateEstado(
  id: string,
  estado: Estado,
): Promise<FieldReport | null> {
  const existing = await getReport(id);
  if (!existing) return null;
  const updated = { ...existing, estado };
  await putReport(updated);
  return updated;
}

export async function deleteReport(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}
