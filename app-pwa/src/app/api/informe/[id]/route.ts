import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme, deleteInforme } from "@/lib/db/sqlite";
import { audioPathFor, docxPathFor } from "@/lib/db/paths";
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

/**
 * Permanently delete an informe: SQLite row + audio + docx files.
 * Idempotent — returns 200 even if the row was never created server-side
 * (e.g. the registro never finished uploading), so the client can always
 * clear its local copy.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  deleteInforme(id);

  // Best-effort file cleanup — missing files are not an error.
  await Promise.allSettled([
    fs.unlink(audioPathFor(id)),
    fs.unlink(docxPathFor(id)),
  ]);

  return NextResponse.json({ ok: true });
}
