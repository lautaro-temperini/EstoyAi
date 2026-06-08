import {
  EXTRACTION_JSON_SCHEMA,
  type DatosInforme,
  type FieldReport,
  type ReportExtraction,
  type ReportMetadata,
} from "./schema";

export { EXTRACTION_JSON_SCHEMA };

export const ASR_LANGUAGE = process.env.NEXT_PUBLIC_QVAC_ASR_LANG ?? "es";

export const SYSTEM_PROMPT = [
  "Convierte la transcripción de un mensaje de voz en un informe de campo estructurado para una ONG.",
  "Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja \"\" (texto) o [] (lista). No uses vocabulario que no esté en el texto.",
  "Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. \"Mensaje de prueba sin información operativa\") y deja el resto vacío.",
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: ALTA solo si se menciona explícitamente una emergencia médica o de seguridad; MEDIA si se menciona un seguimiento necesario; en cualquier otro caso BAJA.",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  "- entidades.fechas: fechas mencionadas; convierte las relativas (\"hoy\", \"el martes\") a fecha absoluta usando la \"Fecha del registro\"; si no hay, [].",
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (columna vertebral del registro; deja vacío lo no mencionado):",
  "- datos.demografia: nombre, edad, fechaNacimiento del beneficiario; esMenor=true SOLO si se indica o se deduce que es menor de edad.",
  "- datos.metricas: peso y talla (antropométricos para nutrición), diagnosticos (lista de diagnósticos médicos específicos: oncología, discapacidad, VIH…), avanceObra (estado de una obra habitacional).",
  "- datos.socioeconomico: familia (condición familiar), ingresos, vivienda, vulnerabilidades (lista).",
  "- datos.intervencion: fecha exacta, lugar (clave en operativos móviles), tipoActividad (taller, consulta médica, asesoría legal, entrega…), profesionales (lista de profesionales o voluntarios presentes).",
  "- datos.seguimiento: compromisos (lista: microcréditos, becas, cobros, devoluciones), situacionLaboral, desempenoAcademico.",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (reacción emocional, percepción de una madre sobre su vivienda…). Si no hay, \"\".",
  "Responde en español. /no_think",
].join("\n");

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
