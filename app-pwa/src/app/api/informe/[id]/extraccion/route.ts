import { NextResponse } from "next/server";
import { getInforme, upsertInformeExtraido } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";
import { buildReport } from "@/lib/reports/build";
import type { ReportExtraction, ReportMetadata } from "@/lib/reports/schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const FALLBACK_META: ReportMetadata = {
  tenant: null,
  tipo: null,
  beneficiario: null,
  programa: null,
  profesional: null,
  sector: null,
  unidad: null,
  capturedAt: Date.now(),
  durationMs: null,
};

/**
 * Persist the LLM extraction for an existing informe. Called by n8n after the
 * Ollama step. n8n never writes SQLite directly — Next stays the single writer.
 *
 * Body: { transcript: string, extraction: ReportExtraction }
 * Reuses buildReport (defaults + merge) but keeps the existing informe id and
 * the metadata captured at RECIBIDO.
 */
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

  let body: { transcript?: unknown; extraction?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  if (!transcript.trim()) {
    return NextResponse.json({ error: "falta transcript" }, { status: 400 });
  }
  if (typeof body.extraction !== "object" || body.extraction === null) {
    return NextResponse.json({ error: "falta extraction" }, { status: 400 });
  }

  // buildReport tolerates partial extraction (mergeDatos + nullish defaults).
  const base = buildReport(
    transcript,
    body.extraction as ReportExtraction,
    row.metadata ?? FALLBACK_META,
  );
  const report = { ...base, id };

  const updated = upsertInformeExtraido({ id, informeJson: report });
  if (!updated) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ id, estado: "EXTRAIDO" });
}
