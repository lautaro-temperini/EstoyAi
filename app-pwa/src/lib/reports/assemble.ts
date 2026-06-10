import {
  EXTRACTION_JSON_SCHEMA,
  type DatosInforme,
  type FieldReport,
  type ReportExtraction,
  type ReportMetadata,
} from "./schema";

export { EXTRACTION_JSON_SCHEMA };

export const ASR_LANGUAGE = process.env.NEXT_PUBLIC_ASR_LANG ?? "es";

// CONFIG-PER-ORG: programas, system prompts y schema varían por organización.
// Externalizar a config/ong.json cuando haya un segundo cliente.
// Puntos de variación:
//   - REGLAS_ABSOLUTAS: idioma, nombre de la ONG, tipo de intervención.
//   - ESTRUCTURA_CAMPOS: campos relevantes al modelo de atención (ej. microcréditos, nutrición, escolaridad).
//   - buildSystemPrompt(enfasis): énfasis por programa (ver SYSTEM_PROMPT_* más abajo).
//   - systemPromptForPrograma(): catálogo de programas activos por organización.

// SYNC: este prompt debe mantenerse idéntico en scripts/gen-n8n-workflow.mjs y assemble.ts
const REGLAS_ABSOLUTAS = [
  "Convierte la transcripción de un mensaje de voz en un informe de campo estructurado para una ONG.",
  "Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja \"\" (texto) o [] (lista). No uses vocabulario que no esté en el texto.",
  "Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. \"Mensaje de prueba sin información operativa\") y deja el resto vacío.",
];

const ESTRUCTURA_CAMPOS = [
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: clasificá en este orden de precedencia (revisá de ALTA a BAJA y aplicá el primer nivel que corresponda):",
  "  ALTA — acción el mismo día: violencia física, abuso sexual o psicológico, violencia intrafamiliar aguda, daños físicos o psicológicos evidentes en niños/as o adolescentes, riesgo de vida inminente.",
  "  MEDIA — acción en 24-72hs: falta de insumos del comedor o de primera necesidad (pañales, leche fórmula, botiquín); desnutrición leve o moderada; falta de controles médicos obligatorios; ausencias frecuentes sin justificación (2+ veces por semana); rotura de equipamiento clave que frena la actividad (heladera, bomba de agua, internet); conflictos o discusiones fuertes entre beneficiarios.",
  "  MEDIA también si hay compromisos de microcrédito con pagos atrasados o en riesgo de incumplimiento. NO aplicar MEDIA si el beneficiario está al día con los pagos.",
  "  MEDIA también si hay una acción de seguimiento explícita pendiente (visita programada, renovación, derivación no urgente) que no encaje en ningún ítem de ALTA ni de BAJA.",
  "  BAJA — resolución semanal/mensual: falta de materiales no esenciales (témperas, hojas, juegos); reparaciones menores (foco, puerta, humedad estética); demoras en legajos que no impiden el seguimiento; baja de voluntario reemplazable. Si la transcripción es puramente informativa: BAJA.",
  "- motivoCriticidad: una frase corta (máx 15 palabras) explicando por qué se asignó esa prioridad. Si es BAJA informativa, devolvé \"\".",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  "- entidades.fechas: fechas mencionadas; convierte las relativas (\"hoy\", \"el martes\") a fecha absoluta usando la \"Fecha del registro\"; si no hay, [].",
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (columna vertebral del registro; deja vacío lo no mencionado):",
  "- datos.demografia: nombre, edad, fechaNacimiento del beneficiario; esMenor=true SOLO si se indica o se deduce que es menor de edad.",
  "- datos.metricas: peso y talla (antropométricos para nutrición), diagnosticos (lista de diagnósticos médicos específicos: oncología, discapacidad, VIH…), avanceObra (estado de una obra habitacional).",
  "- datos.socioeconomico: familia (condición familiar), ingresos, vivienda, vulnerabilidades (lista de situaciones de riesgo mencionadas literalmente: violencia, situación de calle, sin documentación, etc.; si no se mencionan, []).",
  "- datos.intervencion: fecha exacta, lugar (clave en operativos móviles), tipoActividad (taller, consulta médica, asesoría legal, entrega…), profesionales (lista de profesionales o voluntarios presentes).",
  "- datos.seguimiento: situacionLaboral, desempenoAcademico. No uses este campo para acciones pendientes — esas van en accionesPendientes.",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (reacción emocional, percepción de una madre sobre su vivienda…). Si no hay, \"\".",
  "Regla crítica para listas: si un campo de tipo array no se menciona explícitamente en la transcripción, devolvé [] sin excepción. Nunca uses los nombres de campos como ejemplos de valores. \"compromisos\", \"vulnerabilidades\", \"profesionales\" son etiquetas, no datos.",
  "Responde en español. /no_think",
];

/** Compone un system prompt: reglas absolutas → énfasis del programa → estructura. */
function buildSystemPrompt(enfasis: string[] = []): string {
  return [...REGLAS_ABSOLUTAS, ...enfasis, ...ESTRUCTURA_CAMPOS].join("\n");
}

/** Prompt genérico — usado cuando no hay programa seleccionado o es desconocido. */
export const SYSTEM_PROMPT = buildSystemPrompt();

/** Primera Infancia (0-5 años) — el beneficiario es el niño/a; habla la familia. */
export const SYSTEM_PROMPT_PRIMERA_INFANCIA = buildSystemPrompt([
  "CONTEXTO DEL PROGRAMA — Primera Infancia (0 a 5 años): el beneficiario es el niño o niña; el interlocutor en el audio es la familia (madre, padre o cuidador). esMenor es siempre true.",
  "Presta especial atención y prioriza extraer, si se mencionan: peso, talla, percentiles de crecimiento, hitos de desarrollo psicomotor, diagnósticos nutricionales (desnutrición, bajo peso, anemia…), entrega de bolsón de alimentos, fecha de la próxima consulta pediátrica y observaciones sobre el vínculo madre-hijo/a.",
]);

/** Niñez y Adolescencia (6-18 años) — eje escolar y socioemocional. */
export const SYSTEM_PROMPT_NINEZ_ADOLESCENCIA = buildSystemPrompt([
  "CONTEXTO DEL PROGRAMA — Niñez y Adolescencia (6 a 18 años): el beneficiario es un niño, niña o adolescente. esMenor es true salvo que se diga lo contrario.",
  "Presta especial atención y prioriza extraer, si se mencionan: desempeño escolar (en datos.seguimiento.desempenoAcademico), asistencia a la escuela, actividades en las que participa (fútbol, talleres, apoyo escolar), situación familiar, riesgo de deserción escolar, conductas de riesgo y vínculos con pares.",
]);

/** Oficios — adultos en capacitación laboral; NUNCA esMenor. */
export const SYSTEM_PROMPT_OFICIOS = buildSystemPrompt([
  "CONTEXTO DEL PROGRAMA — Oficios: el beneficiario es una persona ADULTA en capacitación laboral. esMenor es SIEMPRE false; nunca lo marques true.",
  "Presta especial atención y prioriza extraer, si se mencionan: el oficio que está aprendiendo, asistencia al taller de capacitación, situación laboral actual (en datos.seguimiento.situacionLaboral), ingresos (en datos.socioeconomico.ingresos), compromisos de pago si hay un microcrédito (en datos.seguimiento.compromisos) y el progreso en la capacitación.",
]);

/** Selecciona el system prompt según el programa; genérico si es null/desconocido. */
export function systemPromptForPrograma(programa: string | null | undefined): string {
  switch (programa) {
    case "primera-infancia":
      return SYSTEM_PROMPT_PRIMERA_INFANCIA;
    case "ninez-adolescencia":
      return SYSTEM_PROMPT_NINEZ_ADOLESCENCIA;
    case "oficios":
      return SYSTEM_PROMPT_OFICIOS;
    default:
      return SYSTEM_PROMPT;
  }
}

/** Empty structured body — every field unknown until the transcript fills it. */
export function emptyDatos(): DatosInforme {
  return {
    demografia: { nombre: "", edad: "", fechaNacimiento: "", esMenor: false },
    metricas: { peso: "", talla: "", diagnosticos: [], avanceObra: "" },
    socioeconomico: { familia: "", ingresos: "", vivienda: "", vulnerabilidades: [] },
    intervencion: { fecha: "", lugar: "", tipoActividad: "", profesionales: [] },
    seguimiento: { compromisos: [], situacionLaboral: "", desempenoAcademico: "" },
    narrativa: "",
  };
}

/** Merge a (possibly partial) extracted body over the empty defaults. */
function mergeDatos(d: Partial<DatosInforme> | undefined): DatosInforme {
  const base = emptyDatos();
  if (!d) return base;
  return {
    demografia: { ...base.demografia, ...d.demografia },
    metricas: { ...base.metricas, ...d.metricas },
    socioeconomico: { ...base.socioeconomico, ...d.socioeconomico },
    intervencion: { ...base.intervencion, ...d.intervencion },
    seguimiento: { ...base.seguimiento, ...d.seguimiento },
    narrativa: d.narrativa ?? base.narrativa,
  };
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Long Spanish date used to ground the LLM, e.g. "martes, 6 de junio de 2026". */
export function fechaLarga(ms: number): string {
  const d = new Date(ms);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

const BLANK_PATTERNS = ["[no speech detected]", "[blank_audio]", "[silence]"];

export function isMeaningful(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  if (BLANK_PATTERNS.some((p) => t.includes(p))) return false;
  if (/^\[[^\]]+\]$/.test(t)) return false;
  return t.replace(/[^\p{L}\p{N}]/gu, "").length >= 2;
}

/** Build the user prompt with date grounding. */
export function buildUserMessage(transcript: string, capturedAt: number): string {
  return `Fecha del registro: ${fechaLarga(capturedAt)}.\n\nTranscripción:\n${transcript}`;
}

/** Assemble the persisted FieldReport from the transcript + LLM extraction. */
export function buildReport(
  transcript: string,
  extraction: ReportExtraction,
  metadata: ReportMetadata,
): FieldReport {
  return {
    id: crypto.randomUUID(),
    transcripcion: transcript,
    resumen: extraction.resumen?.trim() || transcript,
    prioridad: extraction.prioridad ?? "MEDIA",
    motivoCriticidad: extraction.motivoCriticidad ?? "",
    entidades: {
      nombres: extraction.entidades?.nombres ?? [],
      fechas: extraction.entidades?.fechas ?? [],
    },
    accionesPendientes: extraction.accionesPendientes ?? [],
    datos: mergeDatos(extraction.datos),
    metadatos: metadata,
    estado: "PENDIENTE",
    createdAt: Date.now(),
  };
}
