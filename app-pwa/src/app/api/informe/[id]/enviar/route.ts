import { NextResponse } from "next/server";
import { getInforme, setInformeEnviado } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";
import { informeBelongsToRequest } from "@/lib/api/tenant-guard";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Envía un informe a coordinación (gate del promotor). Solo informes LISTO.
 * Una vez enviado aparece en /tablero y el promotor ya no puede borrarlo.
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
  if (row.estado !== "LISTO") {
    return NextResponse.json(
      { error: "el informe aún no está listo", estado: row.estado },
      { status: 409 },
    );
  }

  setInformeEnviado(id);
  return NextResponse.json({ ok: true });
}
