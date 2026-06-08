import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getInforme } from "@/lib/db/sqlite";
import { docxPathFor } from "@/lib/db/paths";
import { reportFileBase } from "@/lib/reports/content";
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

  const filename = row.informeJson
    ? `${reportFileBase(row.informeJson)}.docx`
    : `informe-${id}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
