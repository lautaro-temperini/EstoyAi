import type { Programa } from "./schema";

/** Etiquetas legibles de los programas de la ONG (UI server y client). */
export const PROGRAMA_LABELS: Record<Programa, string> = {
  "primera-infancia": "Primera Infancia",
  "ninez-adolescencia": "Niñez y Adolescencia",
  oficios: "Oficios",
};

/** Etiqueta de un programa; cae a "—" si es null/desconocido. */
export function programaLabel(programa: Programa | null | undefined): string {
  return programa ? (PROGRAMA_LABELS[programa] ?? programa) : "—";
}
