import type { ReportContent } from "./content";
import { DTC_SECCION_IDS } from "./verticals/dtc";

/**
 * Toggles de secciones para la generación del .docx. Cada informe guarda qué
 * secciones incluir; "Identificación" siempre se mantiene. Las secciones se
 * identifican por `Section.id` (estable, independiente del título), así el
 * filtrado funciona para cualquier vertical.
 */

/** Secciones de Pequeños Pasos (vertical por defecto). */
export const SECCION_IDS = [
  "identificacion",
  "metricas",
  "diagnosticos",
  "socioeconomico",
  "vulnerabilidades",
  "intervencion",
  "profesionales",
  "seguimiento",
  "compromisos",
  "acciones",
  "narrativa",
] as const;

export type SeccionId = (typeof SECCION_IDS)[number];

export const SECCION_TITULOS: Record<SeccionId, string> = {
  identificacion: "Identificación y Demografía",
  metricas: "Métricas Técnicas de Impacto",
  diagnosticos: "Diagnósticos médicos",
  socioeconomico: "Contexto Socioeconómico",
  vulnerabilidades: "Vulnerabilidades",
  intervencion: "Detalles de la Intervención",
  profesionales: "Profesionales / voluntarios presentes",
  seguimiento: "Seguimiento de Compromisos",
  compromisos: "Compromisos",
  acciones: "Acciones Pendientes",
  narrativa: "Narrativa Cualitativa del Territorio",
};

export interface CamposConfig {
  /** Ids de secciones habilitadas (Section.id). */
  secciones: string[];
}

export const DEFAULT_CAMPOS: CamposConfig = {
  secciones: [...SECCION_IDS],
};

/**
 * Default por tenant: enciende todas las secciones de su vertical. Se aplica al
 * crear el informe (RECIBIDO) y como fallback. Para una vertical desconocida,
 * usa el default de Pequeños Pasos.
 */
export function defaultCamposForTenant(tenant: string | null | undefined): CamposConfig {
  if (tenant === "dtcvillatranquila") return { secciones: [...DTC_SECCION_IDS] };
  return DEFAULT_CAMPOS;
}

const TITLE_TO_ID = new Map<string, SeccionId>(
  Object.entries(SECCION_TITULOS).map(([id, title]) => [title, id as SeccionId]),
);

/** Drop sections the operator disabled; identification is always kept. */
export function filterReportContent(
  content: ReportContent,
  campos: CamposConfig | null | undefined,
): ReportContent {
  if (!campos) return content;
  const allowed = new Set(campos.secciones);
  return {
    ...content,
    sections: content.sections.filter((s) => {
      // Preferir el id estable; caer al mapeo por título (compat con contenido viejo).
      const id = s.id ?? TITLE_TO_ID.get(s.title);
      if (id === "identificacion") return true;
      return id ? allowed.has(id) : true;
    }),
  };
}

export function normalizeCampos(input: unknown): CamposConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = (input as { secciones?: unknown }).secciones;
  if (!Array.isArray(raw)) return null;
  const secciones = Array.from(
    new Set(raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0)),
  );
  if (secciones.length === 0) return null;
  return { secciones };
}
