import type { FieldReport } from "./schema";

/**
 * Shared report content model. The DOCX renderer builds from this single
 * structure. Every section is ALWAYS present in the output — empty fields
 * show "—" and empty lists show a single "—" entry so no section is blank.
 */

export interface Field {
  label: string;
  value: string;
}

export type Section =
  | { kind: "fields"; title: string; fields: Field[] }
  | { kind: "bullets"; title: string; items: string[] }
  | { kind: "text"; title: string; body: string };

export interface ReportContent {
  titular: string;
  prioridad: FieldReport["prioridad"];
  fecha: string;
  lugar: string;
  resumenEjecutivo: string;
  sections: Section[];
  generadoEl: string;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtFecha(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

const val = (s: string | undefined | null): string =>
  s && s.trim() ? s.trim() : "—";

/** Return list items, or ["—"] when none. */
const items = (a: string[] | undefined): string[] => {
  const r = (a ?? []).filter((x) => x && x.trim());
  return r.length ? r : ["—"];
};

export function buildReportContent(report: FieldReport): ReportContent {
  const d = report.datos;
  const meta = report.metadatos;

  // Titular: prefer apellido + nombre from metadata, fall back to extracted name.
  const titular =
    meta.beneficiario?.apellido && meta.beneficiario?.nombre
      ? `${meta.beneficiario.apellido} ${meta.beneficiario.nombre}`
      : meta.beneficiario?.nombre ||
        (d.demografia.nombre && d.demografia.nombre.trim()
          ? d.demografia.nombre
          : meta.tipo === "grupal"
          ? "Actividad Grupal"
          : "Beneficiario");

  const lugar = val(d.intervencion.lugar || [meta.sector, meta.unidad].filter(Boolean).join(", ") || "");
  const fecha = d.intervencion.fecha?.trim() ? d.intervencion.fecha : fmtFecha(report.createdAt);

  const sections: Section[] = [];

  // 1) Identificación y Demografía — SIEMPRE presente.
  sections.push({
    kind: "fields",
    title: "Identificación y Demografía",
    fields: [
      {
        label: "Nombre completo",
        value:
          meta.beneficiario?.apellido && meta.beneficiario?.nombre
            ? `${meta.beneficiario.apellido}, ${meta.beneficiario.nombre}`
            : val(d.demografia.nombre || meta.beneficiario?.nombre || ""),
      },
      { label: "DNI", value: val(meta.beneficiario?.dni || "") },
      { label: "Fecha de nacimiento", value: val(d.demografia.fechaNacimiento) },
      { label: "Edad", value: val(d.demografia.edad) },
      { label: "Condición", value: d.demografia.esMenor ? "Menor de edad" : "Mayor de edad" },
    ],
  });

  // 2) Métricas Técnicas de Impacto — SIEMPRE presente.
  sections.push({
    kind: "fields",
    title: "Métricas Técnicas de Impacto",
    fields: [
      { label: "Peso", value: val(d.metricas.peso) },
      { label: "Talla", value: val(d.metricas.talla) },
      { label: "Avance de obra habitacional", value: val(d.metricas.avanceObra) },
    ],
  });

  // 3) Diagnósticos médicos — SIEMPRE presente.
  sections.push({
    kind: "bullets",
    title: "Diagnósticos médicos",
    items: items(d.metricas.diagnosticos),
  });

  // 4) Contexto Socioeconómico — SIEMPRE presente.
  sections.push({
    kind: "fields",
    title: "Contexto Socioeconómico",
    fields: [
      { label: "Condición familiar", value: val(d.socioeconomico.familia) },
      { label: "Ingresos", value: val(d.socioeconomico.ingresos) },
      { label: "Situación de vivienda", value: val(d.socioeconomico.vivienda) },
    ],
  });

  // 5) Vulnerabilidades — SIEMPRE presente.
  sections.push({
    kind: "bullets",
    title: "Vulnerabilidades",
    items: items(d.socioeconomico.vulnerabilidades),
  });

  // 6) Detalles de la Intervención — SIEMPRE presente.
  sections.push({
    kind: "fields",
    title: "Detalles de la Intervención",
    fields: [
      { label: "Fecha", value: fecha },
      { label: "Lugar", value: lugar },
      {
        label: "Tipo de actividad",
        value: val(d.intervencion.tipoActividad || (meta.tipo === "grupal" ? "Actividad grupal" : "")),
      },
    ],
  });

  // 7) Profesionales / voluntarios presentes — SIEMPRE presente.
  sections.push({
    kind: "bullets",
    title: "Profesionales / voluntarios presentes",
    items: items(d.intervencion.profesionales),
  });

  // 8) Seguimiento de Compromisos — SIEMPRE presente.
  sections.push({
    kind: "fields",
    title: "Seguimiento de Compromisos",
    fields: [
      { label: "Situación laboral", value: val(d.seguimiento.situacionLaboral) },
      { label: "Desempeño académico", value: val(d.seguimiento.desempenoAcademico) },
    ],
  });

  // 9) Compromisos — SIEMPRE presente.
  sections.push({
    kind: "bullets",
    title: "Compromisos",
    items: items(d.seguimiento.compromisos),
  });

  // 10) Acciones Pendientes — SIEMPRE presente.
  sections.push({
    kind: "bullets",
    title: "Acciones Pendientes",
    items: items(report.accionesPendientes),
  });

  // 11) Narrativa Cualitativa del Territorio — SIEMPRE presente.
  sections.push({
    kind: "text",
    title: "Narrativa Cualitativa del Territorio",
    body: d.narrativa?.trim() || "—",
  });

  return {
    titular,
    prioridad: report.prioridad,
    fecha,
    lugar,
    resumenEjecutivo: report.resumen,
    sections,
    generadoEl: fmtFecha(report.createdAt),
  };
}

/**
 * Filename for the .docx download.
 * Format: Apellido_Nombre_DNI_YYYY-MM-DD.docx
 * Falls back to informe-<uuid> if any piece is missing.
 */
export function reportFileBase(report: FieldReport): string {
  const b = report.metadatos?.beneficiario;
  if (b?.apellido?.trim() && b?.nombre?.trim() && b?.dni?.trim()) {
    const slug = (s: string) =>
      s
        .trim()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const d = new Date(report.createdAt);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `${slug(b.apellido)}_${slug(b.nombre)}_${b.dni.trim()}_${date}`;
  }
  return `informe-${report.id}`;
}
