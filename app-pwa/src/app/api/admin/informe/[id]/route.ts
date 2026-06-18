import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme, deleteInforme } from "@/lib/db/sqlite";
import { audioPathFor, docxPathFor } from "@/lib/db/paths";
import { assertValidId } from "@/lib/api/validate";
import { informeBelongsToRequest } from "@/lib/api/tenant-guard";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Borrado de coordinación (incluye informes ya enviados). Gateado por el
 * middleware: la ruta /api/admin exige rol admin (x-role=admin). Borra fila
 * SQLite + audio + docx. Solo informes del propio tenant (un admin de la ONG A
 * no borra los de la ONG B).
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const row = getInforme(id);
  if (row && !informeBelongsToRequest(row, request.headers)) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  deleteInforme(id);
  await Promise.allSettled([fs.unlink(audioPathFor(id)), fs.unlink(docxPathFor(id))]);
  return NextResponse.json({ ok: true });
}
