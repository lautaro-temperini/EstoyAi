import type { FieldReport } from "../schema";
import type { ReportContent } from "../content";

/**
 * Una "vertical" es la configuración de dominio de una ONG: qué programas
 * registra, cómo se fusiona la extracción del LLM (`datos`) y cómo se arma el
 * documento. El system prompt y el JSON Schema de extracción NO viven acá: los
 * consume exclusivamente n8n (ver scripts/gen-n8n-workflow.mjs). La app solo
 * necesita fusionar la extracción y construir el contenido del informe.
 *
 * El tenant (resuelto por Host en el middleware) elige la vertical. Pequeños
 * Pasos es la vertical por defecto.
 */

/** Programa ofrecido en el flujo de captura (/registrar). */
export interface ProgramaDef {
  /** Id del programa; viaja en la metadata del upload y orienta el prompt en n8n. */
  id: string;
  titulo: string;
  descripcion: string;
  /** Material Symbol name. */
  icon: string;
}

export interface Vertical {
  /** Coincide con el slug del tenant. */
  id: string;
  /** Nombre de la ONG para el pie/creator del .docx. */
  orgName: string;
  /** Catálogo de programas que se ofrecen en /registrar. */
  programas: ProgramaDef[];
  /**
   * Fusiona la extracción cruda del LLM sobre la forma de `datos` de la
   * vertical (rellena defaults; limpia tics de modelos chicos). `ctx.resumen`
   * permite deduplicar narrativa == resumen.
   */
  mergeDatos(raw: unknown, ctx: { resumen: string }): unknown;
  /** Transforma el FieldReport en el contenido del informe (encabezado + secciones). */
  buildContent(report: FieldReport): ReportContent;
}
