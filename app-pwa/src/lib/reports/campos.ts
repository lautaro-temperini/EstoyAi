import type { ReportContent } from "./content";

/**
 * Configurable section toggles for .docx generation. Each ONG can hide
 * sections they don't use; identification always stays in the document.
 */

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
  secciones: SeccionId[];
}

export const DEFAULT_CAMPOS: CamposConfig = {
  secciones: [...SECCION_IDS],
};

const TITLE_TO_ID = new Map(
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
      const id = TITLE_TO_ID.get(s.title);
      if (id === "identificacion") return true;
      return id ? allowed.has(id) : true;
    }),
  };
}

export function normalizeCampos(input: unknown): CamposConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = (input as { secciones?: unknown }).secciones;
  if (!Array.isArray(raw)) return null;
  const secciones = raw.filter((s): s is SeccionId =>
    typeof s === "string" && (SECCION_IDS as readonly string[]).includes(s),
  );
  if (secciones.length === 0) return null;
  return { secciones };
}
