import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { ensureDataDirs, audioPathFor } from "@/lib/db/paths";
import { insertInformeRecibido } from "@/lib/db/sqlite";
import { parseUploadMeta, toReportMetadata } from "@/lib/api/metadata";
import { assertValidId } from "@/lib/api/validate";
import { tenantFromHeaders } from "@/lib/tenants/config";

export const runtime = "nodejs";

async function triggerN8n(payload: { id: string; audioPath: string; metadata: unknown }) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.warn("[api/audio] N8N_WEBHOOK_URL no configurada — el audio quedó guardado sin orquestar");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[api/audio] webhook n8n respondió ${res.status}`);
    }
  } catch (e) {
    console.error("[api/audio] webhook n8n falló:", e);
  }
}

export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "multipart inválido" }, { status: 400 });
    }

    const audio = form.get("audio");
    const metaRaw = form.get("meta");
    if (!(audio instanceof Blob) || typeof metaRaw !== "string") {
      return NextResponse.json({ error: "faltan campos audio y meta" }, { status: 400 });
    }

    const meta = parseUploadMeta(metaRaw);
    if (!meta) {
      return NextResponse.json({ error: "meta inválida" }, { status: 400 });
    }

    try {
      assertValidId(meta.id);
    } catch {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    ensureDataDirs();
    const audioPath = audioPathFor(meta.id);
    const buf = Buffer.from(await audio.arrayBuffer());

    try {
      await fs.writeFile(audioPath, buf);
    } catch {
      return NextResponse.json({ error: "no se pudo guardar el audio" }, { status: 500 });
    }

    // El tenant lo decide el servidor por Host (middleware setea x-tenant), no
    // el cliente: evita falsificación y no requiere tocar SW/IndexedDB.
    const tenant = tenantFromHeaders(request.headers).slug;
    const metadata = toReportMetadata(meta, tenant);
    let created: boolean;
    try {
      ({ created } = insertInformeRecibido({ id: meta.id, audioPath, metadata }));
    } catch {
      await fs.unlink(audioPath).catch(() => {});
      return NextResponse.json({ error: "no se pudo registrar el informe" }, { status: 500 });
    }

    // Fire-and-forget — the promoter gets 202 immediately.
    // Solo en el primer POST de este id: los reintentos del cliente (Background
    // Sync, doble flush) no deben duplicar la ejecución en n8n.
    if (created) {
      void triggerN8n({ id: meta.id, audioPath, metadata });
    } else {
      console.warn(`[api/audio] subida duplicada de ${meta.id} — webhook ya disparado, se ignora`);
    }

    return NextResponse.json({ id: meta.id }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
