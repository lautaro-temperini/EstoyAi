import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { generarDocxParaInforme } from "@/lib/reports/generar-docx";
import { assertValidId } from "@/lib/api/validate";
import { assertInternalCall } from "@/lib/api/internal-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const unauthorized = assertInternalCall(request);
  if (unauthorized) return unauthorized;

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
  if (!row.informeJson) {
    return NextResponse.json({ error: "extracción aún no disponible" }, { status: 409 });
  }

  const result = await generarDocxParaInforme(id, row.informeJson, row.campos);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id, estado: "LISTO" });
}
