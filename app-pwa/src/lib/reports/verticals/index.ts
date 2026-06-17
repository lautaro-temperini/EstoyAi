import type { FieldReport } from "../schema";
import type { ReportContent } from "../content";
import type { Vertical } from "./types";
import { pequenosPasosVertical } from "./pequenospasos";
import { dtcVertical } from "./dtc";

export type { Vertical, ProgramaDef } from "./types";

/**
 * Registro de verticales por tenant (slug). El middleware resuelve el tenant por
 * Host; acá se mapea a la configuración de dominio. Pequeños Pasos es el default
 * (apex, www, localhost y cualquier tenant desconocido).
 *
 * Agregar una ONG: creá su módulo de vertical y sumalo a este mapa. Recordá
 * también sus prompts/schema en scripts/gen-n8n-workflow.mjs.
 */
const VERTICALS: Record<string, Vertical> = {
  [pequenosPasosVertical.id]: pequenosPasosVertical,
  [dtcVertical.id]: dtcVertical,
};

export const DEFAULT_VERTICAL = pequenosPasosVertical;

/** Vertical del tenant; cae a Pequeños Pasos si es null/desconocido. */
export function verticalForTenant(slug: string | null | undefined): Vertical {
  if (!slug) return DEFAULT_VERTICAL;
  return VERTICALS[slug] ?? DEFAULT_VERTICAL;
}

/** Construye el contenido del informe usando la vertical del tenant del registro. */
export function buildReportContent(report: FieldReport): ReportContent {
  return verticalForTenant(report.metadatos?.tenant).buildContent(report);
}
