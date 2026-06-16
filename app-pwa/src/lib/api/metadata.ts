import type { Programa, ReportMetadata, TipoRegistro } from "@/lib/reports/schema";

/** Shape sent by the PWA / Service Worker in the `meta` form field. */
export interface UploadMeta {
  id: string;
  tipo: TipoRegistro | null;
  beneficiario: { nombre: string; apellido: string; dni: string } | null;
  programa: Programa | null;
  profesional: string | null;
  capturedAt: number;
  durationMs: number | null;
}

export function parseUploadMeta(raw: string): UploadMeta | null {
  try {
    const m = JSON.parse(raw) as Partial<UploadMeta>;
    if (!m.id || typeof m.id !== "string") return null;
    if (typeof m.capturedAt !== "number") return null;
    return {
      id: m.id,
      tipo: m.tipo ?? null,
      beneficiario: m.beneficiario ?? null,
      programa: m.programa ?? null,
      profesional: m.profesional ?? null,
      capturedAt: m.capturedAt,
      durationMs: m.durationMs ?? null,
    };
  } catch {
    return null;
  }
}

export function toReportMetadata(meta: UploadMeta, tenant: string | null = null): ReportMetadata {
  return {
    tenant,
    tipo: meta.tipo,
    beneficiario: meta.beneficiario,
    programa: meta.programa,
    profesional: meta.profesional,
    sector: null,
    unidad: null,
    capturedAt: meta.capturedAt,
    durationMs: meta.durationMs,
  };
}
