import { NextResponse } from "next/server";
import { setInformeError } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";
import { assertInternalCall } from "@/lib/api/internal-auth";
import { logEvent } from "@/lib/log";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Mark an informe as failed. Called by n8n's error branch so the promoter's
 * status screen flips to "error" and the retry button appears.
 *
 * Body: { error?: string }
 */
export async function POST(request: Request, { params }: Params) {
  const unauthorized = assertInternalCall(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let msg = "fallo en la orquestación";
  try {
    const body = (await request.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      msg = body.error.slice(0, 500);
    }
  } catch {
    /* sin cuerpo — usa el mensaje por defecto */
  }

  const updated = setInformeError(id, msg);
  if (!updated) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  // Visible en `docker logs` para diagnosticar fallos de whisper/ollama sin
  // entrar a n8n. El motivo también queda en SQLite (lo ve el promotor en la UI).
  logEvent("error", "n8n", "pipeline falló", { id, motivo: msg });
  return NextResponse.json({ id, estado: "ERROR" });
}
