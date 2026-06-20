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

// Guardrail para el LLM de la sede (gemma3:4b, el modelo más chico en uso): en vez de dejar
// "" como pide el prompt, a veces emiten placeholders — "[No especificada]",
// "[10 de junio de 2026]", "N/A", "No se menciona" — que terminan impresos en
// el .docx como si fueran datos. Se limpian acá, del lado del servidor, para
// que el resto del pipeline los trate como vacíos ("—").
// Se agregan: {…} (el modelo a veces regurgita el literal "{Fecha del registro}"
// del prompt) y la forma verbal "no especifica" (antes solo matcheaba el
// adjetivo "no especificada", dejando pasar "No especifica" en Peso/Talla).
const PLACEHOLDER_RE =
  /^\s*(?:\[[^\]]*\]|\{[^}]*\}|no especific\w*|no se (?:menciona|indica|especifica)\w*|sin (?:datos|informaci[oó]n)|n\/?a|no aplica|desconocid\w*)\s*\.?\s*$/i;

// Red de seguridad de criticidad: el LLM de la sede a veces SUB-clasifica
// situaciones graves (visto en la evaluación con gemma3:1b: maltrato infantil
// etiquetado BAJA; 4b también falla a veces). Si hay términos de riesgo, forzamos
// ALTA. Es un PISO: nunca baja la prioridad que asignó el modelo. La lista es
// deliberadamente acotada para no inflar falsas alarmas; puede sobre-marcar
// negaciones ("no hubo violencia"), un error tolerable: en triage, no perder un
// ALTA pesa más que una revisión de más.
const RIESGO_RE =
  /violenci|agred|golpe|abus|maltrat|proteccion|ideacion|suicid|sobredosis|intoxicaci|femicid|desproteccion|riesgo de vida/i;

const sinTildes = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

function elevarSiHayRiesgo(
  prioridad: Prioridad,
  motivo: string,
  resumen: string,
  acciones: string[],
): { prioridad: Prioridad; motivoCriticidad: string } {
  if (prioridad === "ALTA") return { prioridad, motivoCriticidad: motivo };
  const hayRiesgo = [resumen, motivo, ...acciones].some((t) => RIESGO_RE.test(sinTildes(t || "")));
  if (!hayRiesgo) return { prioridad, motivoCriticidad: motivo };
  const nota = "Elevado a ALTA por términos de riesgo detectados — requiere revisión.";
  return {
    prioridad: "ALTA",
    motivoCriticidad: motivo.trim() ? `${nota} (${motivo.trim()})` : nota,
  };
}

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
  const accionesPendientes = coerceStringArray(ext.accionesPendientes);
  const { prioridad, motivoCriticidad } = elevarSiHayRiesgo(
    coercePrioridad(ext.prioridad),
    typeof ext.motivoCriticidad === "string" ? ext.motivoCriticidad : "",
    resumen,
    accionesPendientes,
  );
  return {
    id: crypto.randomUUID(),
    transcripcion: transcript,
    resumen,
    prioridad,
    motivoCriticidad,
    entidades: {
      nombres: coerceStringArray(ext.entidades?.nombres),
      fechas: coerceStringArray(ext.entidades?.fechas),
    },
    accionesPendientes,
    datos,
    metadatos: metadata,
    estado: "PENDIENTE",
    createdAt: Date.now(),
  };
}
