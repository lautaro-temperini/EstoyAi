import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { docxPathFor } from "@/lib/db/paths";
import { reportFileBase, beneficiarioFolder } from "@/lib/reports/content";
import { assertValidId } from "@/lib/api/validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Anexa el informe a Podio (podio.com) vía n8n.
 *
 * Next.js arma el payload y lo reenvía al webhook de n8n (N8N_PODIO_WEBHOOK_URL),
 * que tiene las credenciales de la API de Podio y la lógica para crear/anexar el
 * item en el espacio correspondiente.
 *
 * Si el webhook no está configurado, devuelve 501 para que la UI lo informe.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const row = getInforme(id);
  if (!row) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
  if (row.estado !== "LISTO" || !row.informeJson) {
    return NextResponse.json(
      { error: "el informe aún no está listo", estado: row.estado },
      { status: 409 },
    );
  }

  const url = process.env.N8N_PODIO_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "La integración con Podio aún no está configurada (N8N_PODIO_WEBHOOK_URL)." },
      { status: 501 },
    );
  }

  const informe = row.informeJson;
  const payload = {
    id,
    docxPath: docxPathFor(id),
    filename: `${reportFileBase(informe)}.docx`,
    carpeta: beneficiarioFolder(informe),
    beneficiario: row.metadata?.beneficiario ?? null,
    programa: row.metadata?.programa ?? null,
    // Campos útiles para mapear al item de Podio.
    resumen: informe.resumen,
    prioridad: informe.prioridad,
    motivoCriticidad: informe.motivoCriticidad,
    accionesPendientes: informe.accionesPendientes,
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
    console.error("[podio] webhook n8n falló:", e);
    return NextResponse.json({ error: "no se pudo contactar a n8n" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
