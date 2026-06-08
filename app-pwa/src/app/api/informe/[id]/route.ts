import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  return NextResponse.json({
    id: row.id,
    estado: row.estado,
    error: row.error,
    informe: row.informeJson,
    campos: row.campos,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
