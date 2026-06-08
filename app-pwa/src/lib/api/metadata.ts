import type { ReportMetadata, TipoRegistro } from "@/lib/reports/schema";

/** Shape sent by the PWA / Service Worker in the `meta` form field. */
export interface UploadMeta {
  id: string;
  tipo: TipoRegistro | null;
  beneficiario: { nombre: string; dni: string } | null;
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
      capturedAt: m.capturedAt,
      durationMs: m.durationMs ?? null,
    };
  } catch {
    return null;
  }
}

export function toReportMetadata(meta: UploadMeta): ReportMetadata {
  return {
    tipo: meta.tipo,
    beneficiario: meta.beneficiario,
    sector: null,
    unidad: null,
    capturedAt: meta.capturedAt,
    durationMs: meta.durationMs,
  };
}
