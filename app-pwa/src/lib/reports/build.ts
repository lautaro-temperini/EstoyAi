import type { FieldReport, Prioridad, ReportExtraction, ReportMetadata } from "./schema";
import { verticalForTenant } from "./verticals";

const PRIORIDADES: Prioridad[] = ["ALTA", "MEDIA", "BAJA"];

/** Normaliza la prioridad del LLM al enum; cualquier otra cosa → "MEDIA". */
function coercePrioridad(v: unknown): Prioridad {
  return typeof v === "string" && (PRIORIDADES as string[]).includes(v.toUpperCase())
    ? (v.toUpperCase() as Prioridad)
    : "MEDIA";
}

/** Garantiza una lista de strings no vacíos (el LLM a veces manda no-arrays). */
function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
}

/**
 * Ensamblado del FieldReport persistido a partir de la transcripción + la
 * extracción del LLM. El envelope (resumen, prioridad, entidades, acciones) es
 * común a todas las ONGs; el cuerpo `datos` lo fusiona la vertical del tenant.
 */

// Guardrail para LLMs chicos (gemma3:1b en PCs de poca RAM): en vez de dejar
// "" como pide el prompt, a veces emiten placeholders — "[No especificada]",
// "[10 de junio de 2026]", "N/A", "No se menciona" — que terminan impresos en
// el .docx como si fueran datos. Se limpian acá, del lado del servidor, para
// que el resto del pipeline los trate como vacíos ("—").
const PLACEHOLDER_RE =
  /^\s*(?:\[[^\]]*\]|no especificad\w*|no se (?:menciona|indica|especifica)\w*|sin (?:datos|informaci[oó]n)|n\/?a|no aplica|desconocid\w*)\s*\.?\s*$/i;

function cleanValue(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    return PLACEHOLDER_RE.test(t) ? "" : t;
  }
  if (Array.isArray(v)) {
    return v.map(cleanValue).filter((x) => x !== "");
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = cleanValue(val);
    return out;
  }
  return v;
}

/** Assemble the persisted FieldReport from the transcript + LLM extraction. */
export function buildReport(
  transcript: string,
  extraction: ReportExtraction,
  metadata: ReportMetadata,
): FieldReport {
  const ext = cleanValue(extraction) as ReportExtraction;
  const resumen = ext.resumen?.trim() || transcript;
  const datos = verticalForTenant(metadata.tenant).mergeDatos(ext.datos, { resumen });
  return {
    id: crypto.randomUUID(),
    transcripcion: transcript,
    resumen,
    prioridad: coercePrioridad(ext.prioridad),
    motivoCriticidad: typeof ext.motivoCriticidad === "string" ? ext.motivoCriticidad : "",
    entidades: {
      nombres: coerceStringArray(ext.entidades?.nombres),
      fechas: coerceStringArray(ext.entidades?.fechas),
    },
    accionesPendientes: coerceStringArray(ext.accionesPendientes),
    datos,
    metadatos: metadata,
    estado: "PENDIENTE",
    createdAt: Date.now(),
  };
}
