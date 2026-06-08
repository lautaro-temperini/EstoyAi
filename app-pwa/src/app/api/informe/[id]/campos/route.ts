import { NextResponse } from "next/server";
import { getInforme, setInformeCampos, setInformeListo } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";
import { normalizeCampos } from "@/lib/reports/campos";
import { generarDocxParaInforme } from "@/lib/reports/generar-docx";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
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
  const estadoPrevio = row.estado;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const campos = normalizeCampos(body);
  if (!campos) {
    return NextResponse.json({ error: "secciones inválidas" }, { status: 400 });
  }

  const updated = setInformeCampos(id, campos);
  if (!updated) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  const result = await generarDocxParaInforme(id, updated.informeJson!, campos);
  if (!result.ok) {
    if (estadoPrevio === "LISTO") {
      setInformeListo(id);
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id, estado: "LISTO", campos });
}
