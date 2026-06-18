import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { docxPathFor } from "@/lib/db/paths";
import { reportFileBase, beneficiarioFolder } from "@/lib/reports/content";
import { assertValidId } from "@/lib/api/validate";
import { informeBelongsToRequest } from "@/lib/api/tenant-guard";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Dispara la subida del .docx a Cloudflare R2 vía n8n.
 *
 * Next.js no habla con R2 directamente: arma el payload y lo reenvía al webhook
 * de n8n (N8N_R2_WEBHOOK_URL), que tiene las credenciales y la lógica de subida.
 * Estructura de carpetas destino en R2:  En Revision/<NombreApellidoDNI>/<archivo.docx>
 *
 * Si el webhook no está configurado, devuelve 501 para que la UI lo informe.
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
  if (row.estado !== "LISTO" || !row.informeJson) {
    return NextResponse.json(
      { error: "el informe aún no está listo", estado: row.estado },
      { status: 409 },
    );
  }

  const url = process.env.N8N_R2_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "La subida a Cloudflare aún no está configurada (N8N_R2_WEBHOOK_URL)." },
      { status: 501 },
    );
  }

  const payload = {
    id,
    docxPath: docxPathFor(id),
    filename: `${reportFileBase(row.informeJson)}.docx`,
    beneficiario: row.metadata?.beneficiario ?? null,
    programa: row.metadata?.programa ?? null,
    // Destino en R2: carpeta padre + subcarpeta por beneficiario.
    carpeta: "En Revision",
    subcarpeta: beneficiarioFolder(row.informeJson),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `n8n respondió ${res.status}` },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("[subir-r2] webhook n8n falló:", e);
    return NextResponse.json({ error: "no se pudo contactar a n8n" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
