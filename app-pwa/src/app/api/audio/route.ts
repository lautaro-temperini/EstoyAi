import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { ensureDataDirs, audioPathFor } from "@/lib/db/paths";
import { insertInformeRecibido } from "@/lib/db/sqlite";
import { parseUploadMeta, toReportMetadata } from "@/lib/api/metadata";

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

  ensureDataDirs();
  const audioPath = audioPathFor(meta.id);
  const buf = Buffer.from(await audio.arrayBuffer());
  await fs.writeFile(audioPath, buf);

  const metadata = toReportMetadata(meta);
  insertInformeRecibido({ id: meta.id, audioPath, metadata });

  // Fire-and-forget — the promoter gets 202 immediately.
  void triggerN8n({ id: meta.id, audioPath, metadata });

  return NextResponse.json({ id: meta.id }, { status: 202 });
}
