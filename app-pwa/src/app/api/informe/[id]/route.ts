import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme, deleteInforme } from "@/lib/db/sqlite";
import { audioPathFor, docxPathFor } from "@/lib/db/paths";
import { assertValidId } from "@/lib/api/validate";
import { informeBelongsToRequest } from "@/lib/api/tenant-guard";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
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

  return NextResponse.json({
    id: row.id,
    estado: row.estado,
    error: row.error,
    informe: row.informeJson,
    campos: row.campos,
    enviado: row.enviado,
    enviadoAt: row.enviadoAt,
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
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  // Aislamiento: si la fila existe pero es de otro tenant, no la tocamos (404).
  // Si no existe, el borrado es idempotente (el cliente limpia su copia local).
  const row = getInforme(id);
  if (row && !informeBelongsToRequest(row, request.headers)) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  // Gate: lo ya enviado a coordinación no lo borra el promotor; solo el admin
  // (vía /api/admin/informe/[id]). El cliente igual limpia su copia local.
  if (row?.enviado) {
    return NextResponse.json(
      { error: "el informe ya está en coordinación", enviado: true },
      { status: 409 },
    );
  }

  deleteInforme(id);

  // Best-effort file cleanup — missing files are not an error.
  await Promise.allSettled([
    fs.unlink(audioPathFor(id)),
    fs.unlink(docxPathFor(id)),
  ]);

  return NextResponse.json({ ok: true });
}
