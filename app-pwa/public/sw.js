// Service worker for the Pequeños Pasos PWA.
//
// Two jobs:
//  1. App-shell cache so the UI opens offline.
//  2. Drain the `pending` IndexedDB queue: upload each WAV to /api/audio,
//     retry automatically via Background Sync when the network returns, and
//     tell open pages the progress via postMessage.
//
// Plain classic worker (no imports) — reads IndexedDB directly. The store shape
// must match src/lib/queue/db.ts.

const CACHE = "pp-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
const SYNC_TAG = "upload-audio";
const DB_NAME = "pp-registros";
const DB_VERSION = 1;

// ── app shell ──────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never cache API calls or non-GET requests.
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/").then((r) => r ?? Response.error())));
    return;
  }
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        }),
    ),
  );
});

// ── upload queue ─────────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  // Reject when anything is still pending so the browser retries with backoff.
  event.waitUntil(
    flushAll().then((allOk) => {
      if (!allOk) throw new Error("quedan subidas pendientes");
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "flush") {
    event.waitUntil(flushAll());
  }
});

async function flushAll() {
  const items = await idbGetAll("pending");
  let allOk = true;
  for (const p of items) {
    const ok = await uploadOne(p);
    if (!ok) allOk = false;
  }
  return allOk;
}

async function uploadOne(p) {
  await setEstado(p.id, "subiendo");
  try {
    const form = new FormData();
    form.append("audio", p.wavBlob, p.filename);
    form.append(
      "meta",
      JSON.stringify({
        id: p.id,
        tipo: p.tipo,
        beneficiario: p.beneficiario,
        capturedAt: p.capturedAt,
        durationMs: p.durationMs,
      }),
    );
    const res = await fetch("/api/audio", { method: "POST", body: form });
    if (!res.ok) throw new Error("HTTP " + res.status);
    await idbDelete("pending", p.id);
    await setEstado(p.id, "procesando");
    return true;
  } catch (e) {
    p.intentos = (p.intentos || 0) + 1;
    p.ultimoError = String(e && e.message ? e.message : e);
    await idbPut("pending", p);
    await setEstado(p.id, "error");
    return false;
  }
}

// Update the registro estado and notify any open pages.
async function setEstado(id, estado) {
  const reg = await idbGet("registros", id);
  if (reg) {
    reg.estado = estado;
    await idbPut("registros", reg);
  }
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: "progress", id, estado });
}

// ── raw IndexedDB (mirror of src/lib/queue/db.ts) ────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("pending")) db.createObjectStore("pending", { keyPath: "id" });
      if (!db.objectStoreNames.contains("registros")) {
        const s = db.createObjectStore("registros", { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function req(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const rq = fn(t.objectStore(store));
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
        t.oncomplete = () => db.close();
      }),
  );
}

const idbGetAll = (store) => req(store, "readonly", (s) => s.getAll());
const idbGet = (store, key) => req(store, "readonly", (s) => s.get(key));
const idbPut = (store, val) => req(store, "readwrite", (s) => s.put(val));
const idbDelete = (store, key) => req(store, "readwrite", (s) => s.delete(key));
