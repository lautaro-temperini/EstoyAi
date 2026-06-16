import { NextResponse } from "next/server";
import { getInforme, updateInformeJson } from "@/lib/db/sqlite";
import { assertValidId } from "@/lib/api/validate";
import type { Prioridad } from "@/lib/reports/schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const PRIORIDADES: Prioridad[] = ["ALTA", "MEDIA", "BAJA"];

interface EditBody {
  resumen?: string;
  prioridad?: Prioridad;
  motivoCriticidad?: string;
  accionesPendientes?: string[];
}

/**
 * Corrección del promotor sobre el output del LLM, antes de enviar a coordinación.
 * MVP: edita resumen, prioridad, motivoCriticidad y accionesPendientes. Bloqueado
 * si el informe ya fue enviado (en coordinación) o si todavía no hay extracción.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    assertValidId(id);
  } catch {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const row = getInforme(id);
  if (!row || !row.informeJson) {
    return NextResponse.json({ error: "informe sin datos para editar" }, { status: 404 });
  }
  if (row.enviado) {
    return NextResponse.json({ error: "ya enviado a coordinación; no se puede editar" }, { status: 409 });
  }

  let body: EditBody;
  try {
    body = (await request.json()) as EditBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const next = { ...row.informeJson };
  if (typeof body.resumen === "string") next.resumen = body.resumen.trim();
  if (typeof body.motivoCriticidad === "string") next.motivoCriticidad = body.motivoCriticidad.trim();
  if (body.prioridad && PRIORIDADES.includes(body.prioridad)) next.prioridad = body.prioridad;
  if (Array.isArray(body.accionesPendientes)) {
    next.accionesPendientes = body.accionesPendientes
      .filter((a) => typeof a === "string")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  const updated = updateInformeJson(id, next);
  return NextResponse.json({ ok: true, informe: updated?.informeJson });
}
