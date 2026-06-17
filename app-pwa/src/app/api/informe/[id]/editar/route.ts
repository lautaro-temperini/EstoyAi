import { NextResponse } from "next/server";
import { getInforme, updateInformeJson } from "@/lib/db/sqlite";
import { generarDocxParaInforme } from "@/lib/reports/generar-docx";
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
  // Gate server-side: lo ya enviado a coordinación solo lo edita el admin
  // (x-role lo setea el middleware). El borrador lo edita cualquier usuario de la sede.
  if (row.enviado && request.headers.get("x-role") !== "admin") {
    return NextResponse.json(
      { error: "ya está en coordinación; solo el administrador puede editarlo" },
      { status: 403 },
    );
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
  // Regenerar el .docx para que la descarga refleje la edición (cualquier camino:
  // guardar, o editar+enviar sin guardar). Best-effort: si falla, el dato ya quedó.
  if (updated?.informeJson) {
    await generarDocxParaInforme(id, updated.informeJson, updated.campos);
  }
  return NextResponse.json({ ok: true, informe: updated?.informeJson });
}
