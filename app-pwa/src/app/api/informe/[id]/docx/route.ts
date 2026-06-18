import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { docxPathFor } from "@/lib/db/paths";
import { reportFileBase } from "@/lib/reports/content";
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
  if (row.estado !== "LISTO") {
    return NextResponse.json({ error: "informe aún no listo", estado: row.estado }, { status: 409 });
  }

  const path = docxPathFor(id);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(path);
  } catch {
    return NextResponse.json({ error: "archivo .docx no encontrado" }, { status: 404 });
  }

  const rawName = row.informeJson
    ? `${reportFileBase(row.informeJson)}.docx`
    : `informe-${id}.docx`;
  // El nombre deriva del beneficiario (entrada de usuario): saca CR/LF/comillas
  // para no romper ni inyectar en el header. Mantiene un ASCII seguro + filename*
  // (RFC 5987) con el nombre completo en UTF-8.
  const asciiName =
    rawName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\\r\n]/g, "_") || `informe-${id}.docx`;
  const utf8Name = encodeURIComponent(rawName.replace(/[\r\n"]/g, ""));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "no-store",
    },
  });
}
