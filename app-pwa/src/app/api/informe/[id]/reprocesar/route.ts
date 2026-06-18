import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme, resetInformeRecibido } from "@/lib/db/sqlite";
import { audioPathFor } from "@/lib/db/paths";
import { assertValidId } from "@/lib/api/validate";
import { informeBelongsToRequest } from "@/lib/api/tenant-guard";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Reprocesa un informe que falló en el pipeline. El audio ya está en el server
 * (se subió antes de procesar; ERROR es fallo de whisper/LLM, no de subida), así
 * que alcanza con volver a disparar el webhook de n8n con el mismo id/metadata.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const row = getInforme(id);
  if (!row || !informeBelongsToRequest(row, request.headers)) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  const audioPath = audioPathFor(id);
  try {
    await fs.access(audioPath);
  } catch {
    return NextResponse.json(
      { error: "el audio ya no está en el servidor; no se puede reprocesar" },
      { status: 409 },
    );
  }

  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ error: "n8n no configurado (N8N_WEBHOOK_URL)" }, { status: 501 });
  }

  resetInformeRecibido(id);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, audioPath, metadata: row.metadata }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `n8n respondió ${res.status}` }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "no se pudo contactar a n8n" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
