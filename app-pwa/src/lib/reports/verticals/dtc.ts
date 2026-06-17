import type { FieldReport } from "../schema";
import {
  buildReportHeader,
  val,
  items,
  listAsField,
  type ReportContent,
  type Section,
} from "../content";
import type { Vertical } from "./types";

/**
 * Vertical DTC — Dispositivo Territorial Comunitario (modelo SEDRONAR), p. ej.
 * el DTC de Villa Tranquila (Avellaneda). Acompañamiento integral de consumos
 * problemáticos: el eje no es la sustancia sino la trayectoria de vida y el
 * acceso a derechos.
 *
 * Tres tipos de registro (programas):
 *   - hpc          → Hoja de Primer Contacto (primera escucha / diagnóstico inicial).
 *   - seguimiento  → Registro de evolución de una escucha posterior.
 *   - taller       → Participación en espacios/talleres comunitarios.
 *
 * El system prompt (énfasis por programa) y el JSON Schema de extracción se
 * embeben en n8n (scripts/gen-n8n-workflow.mjs). DTC_EXTRACTION_SCHEMA de abajo
 * es la fuente de verdad que ese generador espeja.
 */

// ── Modelo de datos ──────────────────────────────────────────────────────────

export interface DtcDatos {
  identificacion: { edad: string; fechaNacimiento: string; genero: string };
  /** HPC: por qué llega y qué pide explícitamente. */
  consulta: { motivo: string; demanda: string };
  /** Situación de consumo (si la hubiera). */
  consumo: { sustancias: string[]; frecuencia: string; tiempo: string; observaciones: string };
  /** Red familiar y vincular + situación habitacional. */
  redVincular: { familia: string; vinculos: string; habitacional: string };
  educacionTrabajo: { situacionEducativa: string; situacionLaboral: string; ingresos: string };
  salud: { fisica: string; mental: string; tratamientosPrevios: string };
  /** Derechos vulnerados detectados (salud, vivienda, documentación, …). */
  vulneracionDerechos: string[];
  /** Fortalezas, intereses, recursos propios de la persona. */
  recursosIntereses: string;
  /** Participación en talleres / actividades comunitarias. */
  talleres: { espacios: string[]; participacion: string };
  /** Cierre de la HPC: lectura del equipo + plan. */
  estrategia: { hipotesis: string; hojaDeRuta: string; derivaciones: string[] };
  /** Registro de seguimiento (escuchas posteriores). */
  seguimiento: {
    situacionActual: string;
    cambios: string;
    intervenciones: string[];
    articulaciones: string[];
    acuerdos: string[];
    proximosPasos: string[];
  };
  /** Detalles cualitativos sutiles. */
  narrativa: string;
}

export function emptyDtcDatos(): DtcDatos {
  return {
    identificacion: { edad: "", fechaNacimiento: "", genero: "" },
    consulta: { motivo: "", demanda: "" },
    consumo: { sustancias: [], frecuencia: "", tiempo: "", observaciones: "" },
    redVincular: { familia: "", vinculos: "", habitacional: "" },
    educacionTrabajo: { situacionEducativa: "", situacionLaboral: "", ingresos: "" },
    salud: { fisica: "", mental: "", tratamientosPrevios: "" },
    vulneracionDerechos: [],
    recursosIntereses: "",
    talleres: { espacios: [], participacion: "" },
    estrategia: { hipotesis: "", hojaDeRuta: "", derivaciones: [] },
    seguimiento: {
      situacionActual: "",
      cambios: "",
      intervenciones: [],
      articulaciones: [],
      acuerdos: [],
      proximosPasos: [],
    },
    narrativa: "",
  };
}

function mergeDtcDatos(d: Partial<DtcDatos> | undefined): DtcDatos {
  const base = emptyDtcDatos();
  if (!d) return base;
  return {
    identificacion: { ...base.identificacion, ...d.identificacion },
    consulta: { ...base.consulta, ...d.consulta },
    consumo: { ...base.consumo, ...d.consumo },
    redVincular: { ...base.redVincular, ...d.redVincular },
    educacionTrabajo: { ...base.educacionTrabajo, ...d.educacionTrabajo },
    salud: { ...base.salud, ...d.salud },
    vulneracionDerechos: d.vulneracionDerechos ?? base.vulneracionDerechos,
    recursosIntereses: d.recursosIntereses ?? base.recursosIntereses,
    talleres: { ...base.talleres, ...d.talleres },
    estrategia: { ...base.estrategia, ...d.estrategia },
    seguimiento: { ...base.seguimiento, ...d.seguimiento },
    narrativa: d.narrativa ?? base.narrativa,
  };
}

// ── JSON Schema de extracción (grammar para Ollama) ───────────────────────────
// SYNC: mantener idéntico a la copia en scripts/gen-n8n-workflow.mjs (SCHEMAS.dtc).

const strArray = { type: "array", items: { type: "string" } } as const;

export const DTC_EXTRACTION_SCHEMA: Record<string, unknown> = {
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
        identificacion: {
          type: "object",
          properties: {
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            genero: { type: "string" },
          },
          required: ["edad", "fechaNacimiento", "genero"],
          additionalProperties: false,
        },
        consulta: {
          type: "object",
          properties: { motivo: { type: "string" }, demanda: { type: "string" } },
          required: ["motivo", "demanda"],
          additionalProperties: false,
        },
        consumo: {
          type: "object",
          properties: {
            sustancias: strArray,
            frecuencia: { type: "string" },
            tiempo: { type: "string" },
            observaciones: { type: "string" },
          },
          required: ["sustancias", "frecuencia", "tiempo", "observaciones"],
          additionalProperties: false,
        },
        redVincular: {
          type: "object",
          properties: {
            familia: { type: "string" },
            vinculos: { type: "string" },
            habitacional: { type: "string" },
          },
          required: ["familia", "vinculos", "habitacional"],
          additionalProperties: false,
        },
        educacionTrabajo: {
          type: "object",
          properties: {
            situacionEducativa: { type: "string" },
            situacionLaboral: { type: "string" },
            ingresos: { type: "string" },
          },
          required: ["situacionEducativa", "situacionLaboral", "ingresos"],
          additionalProperties: false,
        },
        salud: {
          type: "object",
          properties: {
            fisica: { type: "string" },
            mental: { type: "string" },
            tratamientosPrevios: { type: "string" },
          },
          required: ["fisica", "mental", "tratamientosPrevios"],
          additionalProperties: false,
        },
        vulneracionDerechos: strArray,
        recursosIntereses: { type: "string" },
        talleres: {
          type: "object",
          properties: { espacios: strArray, participacion: { type: "string" } },
          required: ["espacios", "participacion"],
          additionalProperties: false,
        },
        estrategia: {
          type: "object",
          properties: {
            hipotesis: { type: "string" },
            hojaDeRuta: { type: "string" },
            derivaciones: strArray,
          },
          required: ["hipotesis", "hojaDeRuta", "derivaciones"],
          additionalProperties: false,
        },
        seguimiento: {
          type: "object",
          properties: {
            situacionActual: { type: "string" },
            cambios: { type: "string" },
            intervenciones: strArray,
            articulaciones: strArray,
            acuerdos: strArray,
            proximosPasos: strArray,
          },
          required: [
            "situacionActual",
            "cambios",
            "intervenciones",
            "articulaciones",
            "acuerdos",
            "proximosPasos",
          ],
          additionalProperties: false,
        },
        narrativa: { type: "string" },
      },
      required: [
        "identificacion",
        "consulta",
        "consumo",
        "redVincular",
        "educacionTrabajo",
        "salud",
        "vulneracionDerechos",
        "recursosIntereses",
        "talleres",
        "estrategia",
        "seguimiento",
        "narrativa",
      ],
      additionalProperties: false,
    },
  },
  required: ["resumen", "prioridad", "motivoCriticidad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};

// ── Armado del documento ──────────────────────────────────────────────────────
// Todos los ids de sección que puede emitir esta vertical (los 3 programas).
// SYNC: usado por campos.ts para el default de un informe DTC.
export const DTC_SECCION_IDS = [
  "identificacion",
  "consulta",
  "consumo",
  "redVincular",
  "educacionTrabajo",
  "salud",
  "vulneracion",
  "recursos",
  "talleres",
  "estrategia",
  "situacionActual",
  "cambios",
  "intervenciones",
  "articulaciones",
  "acuerdos",
  "proximosPasos",
  "acciones",
  "narrativa",
] as const;

function identificacionSection(report: FieldReport, d: DtcDatos): Section {
  const meta = report.metadatos;
  return {
    id: "identificacion",
    kind: "fields",
    title: "Identificación",
    fields: [
      {
        label: "Nombre completo",
        value:
          meta.beneficiario?.apellido && meta.beneficiario?.nombre
            ? `${meta.beneficiario.apellido}, ${meta.beneficiario.nombre}`
            : val(meta.beneficiario?.nombre || ""),
      },
      { label: "DNI", value: val(meta.beneficiario?.dni || "") },
      { label: "Fecha de nacimiento", value: val(d.identificacion.fechaNacimiento) },
      { label: "Edad", value: val(d.identificacion.edad) },
      { label: "Género", value: val(d.identificacion.genero) },
    ],
  };
}

/** HPC — Hoja de Primer Contacto: diagnóstico inicial integral. */
function buildHpcSections(report: FieldReport, d: DtcDatos): Section[] {
  return [
    identificacionSection(report, d),
    {
      id: "consulta",
      kind: "fields",
      title: "Motivo de consulta y demanda",
      fields: [
        { label: "Motivo de consulta", value: val(d.consulta.motivo) },
        { label: "Demanda explícita", value: val(d.consulta.demanda) },
      ],
    },
    {
      id: "consumo",
      kind: "fields",
      title: "Situación de consumo",
      fields: [
        { label: "Sustancias", value: listAsField(d.consumo.sustancias) },
        { label: "Frecuencia", value: val(d.consumo.frecuencia) },
        { label: "Tiempo de consumo", value: val(d.consumo.tiempo) },
        { label: "Observaciones", value: val(d.consumo.observaciones) },
      ],
    },
    {
      id: "redVincular",
      kind: "fields",
      title: "Red vincular",
      fields: [
        { label: "Situación familiar", value: val(d.redVincular.familia) },
        { label: "Vínculos significativos", value: val(d.redVincular.vinculos) },
        { label: "Situación habitacional", value: val(d.redVincular.habitacional) },
      ],
    },
    {
      id: "educacionTrabajo",
      kind: "fields",
      title: "Educación y trabajo",
      fields: [
        { label: "Situación educativa", value: val(d.educacionTrabajo.situacionEducativa) },
        { label: "Situación laboral", value: val(d.educacionTrabajo.situacionLaboral) },
        { label: "Ingresos", value: val(d.educacionTrabajo.ingresos) },
      ],
    },
    {
      id: "salud",
      kind: "fields",
      title: "Salud",
      fields: [
        { label: "Salud física", value: val(d.salud.fisica) },
        { label: "Salud mental", value: val(d.salud.mental) },
        { label: "Tratamientos previos", value: val(d.salud.tratamientosPrevios) },
      ],
    },
    {
      id: "vulneracion",
      kind: "bullets",
      title: "Vulneración de derechos",
      items: items(d.vulneracionDerechos),
    },
    {
      id: "recursos",
      kind: "text",
      title: "Recursos e intereses",
      body: d.recursosIntereses?.trim() || "—",
    },
    {
      id: "estrategia",
      kind: "fields",
      title: "Hipótesis y hoja de ruta",
      fields: [
        { label: "Hipótesis inicial", value: val(d.estrategia.hipotesis) },
        { label: "Hoja de ruta", value: val(d.estrategia.hojaDeRuta) },
        { label: "Derivaciones", value: listAsField(d.estrategia.derivaciones) },
      ],
    },
    { id: "acciones", kind: "bullets", title: "Acciones pendientes", items: items(report.accionesPendientes) },
    { id: "narrativa", kind: "text", title: "Observaciones", body: d.narrativa?.trim() || "—" },
  ];
}

/** Seguimiento — registro de evolución de una escucha posterior. */
function buildSeguimientoSections(report: FieldReport, d: DtcDatos): Section[] {
  const s = d.seguimiento;
  return [
    identificacionSection(report, d),
    { id: "situacionActual", kind: "text", title: "Situación actual", body: s.situacionActual?.trim() || "—" },
    { id: "cambios", kind: "text", title: "Cambios desde el último encuentro", body: s.cambios?.trim() || "—" },
    { id: "intervenciones", kind: "bullets", title: "Intervenciones realizadas", items: items(s.intervenciones) },
    { id: "articulaciones", kind: "bullets", title: "Articulaciones externas", items: items(s.articulaciones) },
    { id: "acuerdos", kind: "bullets", title: "Acuerdos", items: items(s.acuerdos) },
    {
      id: "proximosPasos",
      kind: "bullets",
      title: "Próximos pasos",
      items: items(s.proximosPasos.length ? s.proximosPasos : report.accionesPendientes),
    },
    { id: "narrativa", kind: "text", title: "Observaciones", body: d.narrativa?.trim() || "—" },
  ];
}

/** Taller — participación en espacios/actividades comunitarias. */
function buildTallerSections(report: FieldReport, d: DtcDatos): Section[] {
  const s = d.seguimiento;
  return [
    identificacionSection(report, d),
    { id: "talleres", kind: "bullets", title: "Espacios y talleres", items: items(d.talleres.espacios) },
    {
      id: "participacion",
      kind: "text",
      title: "Participación y evolución",
      body: d.talleres.participacion?.trim() || "—",
    },
    { id: "articulaciones", kind: "bullets", title: "Articulaciones externas", items: items(s.articulaciones) },
    {
      id: "proximosPasos",
      kind: "bullets",
      title: "Próximos pasos",
      items: items(s.proximosPasos.length ? s.proximosPasos : report.accionesPendientes),
    },
    { id: "narrativa", kind: "text", title: "Observaciones", body: d.narrativa?.trim() || "—" },
  ];
}

function buildDtcContent(report: FieldReport): ReportContent {
  const d = mergeDtcDatos(report.datos as Partial<DtcDatos> | undefined);
  const header = buildReportHeader(report, "DTC Villa Tranquila");
  let sections: Section[];
  switch (report.metadatos?.programa) {
    case "seguimiento":
      sections = buildSeguimientoSections(report, d);
      break;
    case "taller":
      sections = buildTallerSections(report, d);
      break;
    case "hpc":
    default:
      sections = buildHpcSections(report, d);
      break;
  }
  return { ...header, sections };
}

export const dtcVertical: Vertical = {
  id: "dtcvillatranquila",
  orgName: "DTC Villa Tranquila",
  programas: [
    {
      id: "hpc",
      titulo: "Hoja de Primer Contacto",
      descripcion: "Primera escucha · diagnóstico inicial",
      icon: "person_add",
    },
    {
      id: "seguimiento",
      titulo: "Seguimiento",
      descripcion: "Registro de evolución de una escucha",
      icon: "event_repeat",
    },
    {
      id: "taller",
      titulo: "Taller / Actividad",
      descripcion: "Participación en espacios comunitarios",
      icon: "diversity_3",
    },
  ],
  mergeDatos(raw, ctx) {
    const datos = mergeDtcDatos(raw as Partial<DtcDatos> | undefined);
    if (datos.narrativa && datos.narrativa.trim() === ctx.resumen.trim()) {
      datos.narrativa = "";
    }
    return datos;
  },
  buildContent: buildDtcContent,
};
