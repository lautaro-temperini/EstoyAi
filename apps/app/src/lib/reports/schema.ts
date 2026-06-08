/**
 * Domain model for a field report (informe de campo).
 *
 * A field operator dictates an activity (aid distribution, health check, etc.);
 * QVAC transcribes it on-device and the LLM extracts a structured summary. The
 * operator's verbatim words are always preserved in `transcripcion` — the
 * extraction only organises, it must not replace the source of truth.
 */

export type Prioridad = "ALTA" | "MEDIA" | "BAJA";
export type Estado = "PENDIENTE" | "CONFIRMADO";

/**
 * Structured field-report body extracted by the LLM. These are the "hard" and
 * biographic data points an NGO can't omit after an intervention. Every string
 * defaults to "" and every array to [] when the transcript doesn't mention it —
 * the model must never invent values.
 */
export interface DatosInforme {
  /** Identificación y demografía crítica (rigor extra si es menor de edad). */
  demografia: {
    nombre: string;
    edad: string;
    fechaNacimiento: string;
    esMenor: boolean;
  };
  /** Métricas técnicas de impacto (nutrición / salud / obra habitacional). */
  metricas: {
    /** Antropométrico — peso (p. ej. "12 kg"). */
    peso: string;
    /** Antropométrico — talla/altura (p. ej. "85 cm"). */
    talla: string;
    /** Diagnósticos médicos específicos (oncología, discapacidad, VIH, …). */
    diagnosticos: string[];
    /** Estado de avance de una obra habitacional, si aplica. */
    avanceObra: string;
  };
  /** Contexto socioeconómico del entorno. */
  socioeconomico: {
    familia: string;
    ingresos: string;
    vivienda: string;
    vulnerabilidades: string[];
  };
  /** Detalles de la intervención. */
  intervencion: {
    fecha: string;
    lugar: string;
    /** taller, consulta médica, asesoría legal, entrega, … */
    tipoActividad: string;
    /** Profesionales o voluntarios presentes. */
    profesionales: string[];
  };
  /** Seguimiento de compromisos (microcréditos, becas, situación laboral). */
  seguimiento: {
    compromisos: string[];
    situacionLaboral: string;
    desempenoAcademico: string;
  };
  /** Narrativa cualitativa del territorio (reacción emocional, percepciones). */
  narrativa: string;
}

/** The portion the LLM produces from the transcript (grammar-constrained). */
export interface ReportExtraction {
  /** Executive summary — consolidated key points; goes first in the report. */
  resumen: string;
  /** Visual triage class — ALTA for urgent medical/safety findings. */
  prioridad: Prioridad;
  /** Extracted entities for quick reference / follow-up. */
  entidades: {
    nombres: string[];
    fechas: string[];
  };
  /** Pending actions (seguimientos médicos, renovaciones, …). */
  accionesPendientes: string[];
  /** Structured one-page report body. */
  datos: DatosInforme;
}

export type TipoRegistro = "individual" | "grupal";

/** Auto-captured context for the report (provided by the device/frontend). */
export interface ReportMetadata {
  /** What was registered: an individual beneficiary or a group activity. */
  tipo: TipoRegistro | null;
  /** Identified beneficiary (individual flow); null for group activities. */
  beneficiario: { nombre: string; dni: string } | null;
  sector: string | null;
  unidad: string | null;
  /** When the audio was captured on-device (epoch ms). */
  capturedAt: number;
  /** Recording length in ms, when derivable. */
  durationMs: number | null;
}

export interface FieldReport extends ReportExtraction {
  id: string;
  /** Verbatim transcript — full text available on demand for verification. */
  transcripcion: string;
  metadatos: ReportMetadata;
  estado: Estado;
  /** When the report record was created on the server (epoch ms). */
  createdAt: number;
}

/**
 * JSON Schema passed to `completeJSON`. The grammar forces exactly these keys
 * and constrains `prioridad` to the enum, so the small model can't drift.
 */
const strArray = { type: "array", items: { type: "string" } } as const;

export const EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    prioridad: { type: "string", enum: ["ALTA", "MEDIA", "BAJA"] },
    entidades: {
      type: "object",
      properties: { nombres: strArray, fechas: strArray },
      required: ["nombres", "fechas"],
      additionalProperties: false,
    },
    accionesPendientes: strArray,
    datos: {
      type: "object",
      properties: {
        demografia: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            esMenor: { type: "boolean" },
          },
          required: ["nombre", "edad", "fechaNacimiento", "esMenor"],
          additionalProperties: false,
        },
        metricas: {
          type: "object",
          properties: {
            peso: { type: "string" },
            talla: { type: "string" },
            diagnosticos: strArray,
            avanceObra: { type: "string" },
          },
          required: ["peso", "talla", "diagnosticos", "avanceObra"],
          additionalProperties: false,
        },
        socioeconomico: {
          type: "object",
          properties: {
            familia: { type: "string" },
            ingresos: { type: "string" },
            vivienda: { type: "string" },
            vulnerabilidades: strArray,
          },
          required: ["familia", "ingresos", "vivienda", "vulnerabilidades"],
          additionalProperties: false,
        },
        intervencion: {
          type: "object",
          properties: {
            fecha: { type: "string" },
            lugar: { type: "string" },
            tipoActividad: { type: "string" },
            profesionales: strArray,
          },
          required: ["fecha", "lugar", "tipoActividad", "profesionales"],
          additionalProperties: false,
        },
        seguimiento: {
          type: "object",
          properties: {
            compromisos: strArray,
            situacionLaboral: { type: "string" },
            desempenoAcademico: { type: "string" },
          },
          required: ["compromisos", "situacionLaboral", "desempenoAcademico"],
          additionalProperties: false,
        },
        narrativa: { type: "string" },
      },
      required: [
        "demografia",
        "metricas",
        "socioeconomico",
        "intervencion",
        "seguimiento",
        "narrativa",
      ],
      additionalProperties: false,
    },
  },
  required: ["resumen", "prioridad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};
