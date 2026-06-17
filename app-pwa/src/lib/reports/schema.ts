/**
 * Domain model for a field report (informe de campo).
 *
 * A field operator dictates an activity (aid distribution, health check, etc.);
 * the audio is transcribed and the LLM extracts a structured summary. The
 * operator's verbatim words are always preserved in `transcripcion` — the
 * extraction only organises, it must not replace the source of truth.
 */

// CONFIG-PER-ORG: programas, system prompts y schema varían por organización.
// Externalizar a config/ong.json cuando haya un segundo cliente.
// Puntos de variación:
//   - Prioridad: niveles y criterios de clasificación (hoy: ALTA/MEDIA/BAJA con definiciones de esta ONG).
//   - DatosInforme: estructura interna varía según modelo de atención (ej. obra habitacional, microcrédito).
//   - ReportExtraction: campos extraídos por el LLM; cada ONG puede necesitar campos distintos.
//   - EXTRACTION_JSON_SCHEMA: grammar para Ollama; debe mantenerse en sync con ReportExtraction.
//   - TipoRegistro / Programa: catálogos específicos de cada organización.

export type Prioridad = "ALTA" | "MEDIA" | "BAJA";
export type Estado = "PENDIENTE" | "CONFIRMADO";

/**
 * Structured field-report body extracted by the LLM. These are the "hard" and
 * biographic data points an NGO can't omit after an intervention. Every string
 * defaults to "" and every array to [] when the transcript doesn't mention it —
 * the model must never invent values.
 */
export interface DatosInforme {
  /** Identificación y demografía crítica (rigor extra si es menor de edad).
   *  El nombre NO se extrae del audio: viene de los campos fijos (beneficiario). */
  demografia: {
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
  /** Por qué se asignó esa prioridad (≤ 15 palabras; "" si BAJA informativa). */
  motivoCriticidad: string;
  /** Extracted entities for quick reference / follow-up. */
  entidades: {
    nombres: string[];
    fechas: string[];
  };
  /** Pending actions (seguimientos médicos, renovaciones, …). */
  accionesPendientes: string[];
  /**
   * Structured report body. Su forma depende de la vertical del tenant
   * (DatosInforme para Pequeños Pasos, DtcDatos para el DTC, …). Por eso es
   * `unknown` acá: cada vertical castea a su tipo en mergeDatos/buildContent.
   */
  datos: unknown;
}

export type TipoRegistro = "individual" | "grupal";

/**
 * Programa bajo el que se registra la intervención. El catálogo activo lo define
 * la vertical del tenant (ver lib/reports/verticals); este union reúne los
 * programas de TODAS las verticales para mantener el tipado en el flujo de
 * captura. Pequeños Pasos: primera-infancia / ninez-adolescencia / oficios.
 * DTC (SEDRONAR): hpc / seguimiento / taller.
 */
export type Programa =
  | "primera-infancia"
  | "ninez-adolescencia"
  | "oficios"
  | "hpc"
  | "seguimiento"
  | "taller";

/** Auto-captured context for the report (provided by the device/frontend). */
export interface ReportMetadata {
  /** ONG (subdominio) que originó el registro; orienta el system prompt en n8n. */
  tenant: string | null;
  /** What was registered: an individual beneficiary or a group activity. */
  tipo: TipoRegistro | null;
  /** Identified beneficiary (individual flow); null for group activities. */
  beneficiario: { nombre: string; apellido: string; dni: string } | null;
  /** Programa seleccionado en el flujo de captura; orienta el system prompt. */
  programa: Programa | null;
  /** Profesional/promotor que tomó el registro (atribución; lo carga el dispositivo). */
  profesional: string | null;
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
 * JSON Schema passed to the LLM (`response_format` / Ollama `format`). The
 * grammar forces exactly these keys and constrains `prioridad` to the enum, so
 * the small model can't drift.
 */
const strArray = { type: "array", items: { type: "string" } } as const;

export const EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    prioridad: { type: "string", enum: ["ALTA", "MEDIA", "BAJA"] },
    motivoCriticidad: { type: "string" },
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
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            esMenor: { type: "boolean" },
          },
          required: ["edad", "fechaNacimiento", "esMenor"],
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
          },
          required: ["fecha", "lugar", "tipoActividad"],
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
  required: ["resumen", "prioridad", "motivoCriticidad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};
