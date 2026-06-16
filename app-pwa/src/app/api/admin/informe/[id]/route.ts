import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { deleteInforme } from "@/lib/db/sqlite";
import { audioPathFor, docxPathFor } from "@/lib/db/paths";
import { assertValidId } from "@/lib/api/validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Borrado de coordinación (incluye informes ya enviados). Gateado por el
 * middleware: la ruta /api/admin exige rol admin (x-role=admin). Borra fila
 * SQLite + audio + docx.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  deleteInforme(id);
  await Promise.allSettled([fs.unlink(audioPathFor(id)), fs.unlink(docxPathFor(id))]);
  return NextResponse.json({ ok: true });
}
