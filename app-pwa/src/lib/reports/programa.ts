import type { Programa } from "./schema";

/**
 * Etiquetas legibles de los programas (UI server y client). Reúne los programas
 * de TODAS las verticales: los ids son únicos a nivel global, así `programaLabel`
 * funciona sin conocer el tenant. El catálogo que se OFRECE en /registrar sí es
 * por vertical (ver lib/reports/verticals).
 */
export const PROGRAMA_LABELS: Record<Programa, string> = {
  // Pequeños Pasos
  "primera-infancia": "Primera Infancia",
  "ninez-adolescencia": "Niñez y Adolescencia",
  oficios: "Oficios",
  // DTC (SEDRONAR)
  hpc: "Hoja de Primer Contacto",
  seguimiento: "Seguimiento",
  taller: "Taller / Actividad",
};

/** Etiqueta de un programa; cae a "—" si es null/desconocido. */
export function programaLabel(programa: Programa | null | undefined): string {
  return programa ? (PROGRAMA_LABELS[programa] ?? programa) : "—";
}
