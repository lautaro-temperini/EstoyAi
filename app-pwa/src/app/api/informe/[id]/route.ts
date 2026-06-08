import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
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
