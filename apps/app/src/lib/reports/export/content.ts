import type { FieldReport } from "../schema";

/**
 * Shared report content model. Both the PDF (@react-pdf/renderer) and the DOCX
 * (docx) renderers build from this single structure so the two downloads stay
 * identical. Empty optional sections are dropped; the critical identification
 * block is always present (it "cannot be omitted under any circumstance").
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

const has = (s: string | undefined | null): s is string => !!s && s.trim().length > 0;
const list = (a: string[] | undefined): string[] => (a ?? []).filter((x) => has(x));

/** Only keep fields that have a value (used for optional sections). */
function presentFields(fields: Field[]): Field[] {
  return fields.filter((f) => has(f.value));
}

export function buildReportContent(report: FieldReport): ReportContent {
  const d = report.datos;
  const meta = report.metadatos;

  const titular =
    has(d.demografia.nombre)
      ? d.demografia.nombre
      : meta.beneficiario?.nombre ||
        (meta.tipo === "grupal" ? "Actividad Grupal" : "Beneficiario");

  const lugar =
    d.intervencion.lugar ||
    [meta.sector, meta.unidad].filter(Boolean).join(", ");

  const fecha = has(d.intervencion.fecha)
    ? d.intervencion.fecha
    : fmtFecha(report.createdAt);

  const sections: Section[] = [];

  // 1) Identification & demographics — ALWAYS shown (critical data).
  sections.push({
    kind: "fields",
    title: "Identificación y Demografía",
    fields: [
      { label: "Nombre", value: d.demografia.nombre || meta.beneficiario?.nombre || "No registrado" },
      { label: "DNI", value: meta.beneficiario?.dni || "No registrado" },
      { label: "Edad", value: d.demografia.edad || "No registrada" },
      { label: "Fecha de nacimiento", value: d.demografia.fechaNacimiento || "No registrada" },
      ...(d.demografia.esMenor ? [{ label: "Condición", value: "Menor de edad" }] : []),
    ],
  });

  // 2) Technical impact metrics (nutrition / medical / housing).
  const metricas = presentFields([
    { label: "Peso", value: d.metricas.peso },
    { label: "Talla", value: d.metricas.talla },
    { label: "Avance de obra habitacional", value: d.metricas.avanceObra },
  ]);
  if (metricas.length || list(d.metricas.diagnosticos).length) {
    sections.push({ kind: "fields", title: "Métricas Técnicas de Impacto", fields: metricas });
    if (list(d.metricas.diagnosticos).length) {
      sections.push({
        kind: "bullets",
        title: "Diagnósticos médicos",
        items: list(d.metricas.diagnosticos),
      });
    }
  }

  // 3) Socioeconomic context.
  const socio = presentFields([
    { label: "Condición familiar", value: d.socioeconomico.familia },
    { label: "Ingresos", value: d.socioeconomico.ingresos },
    { label: "Situación de vivienda", value: d.socioeconomico.vivienda },
  ]);
  const vuln = list(d.socioeconomico.vulnerabilidades);
  if (socio.length || vuln.length) {
    sections.push({ kind: "fields", title: "Contexto Socioeconómico", fields: socio });
    if (vuln.length) {
      sections.push({ kind: "bullets", title: "Vulnerabilidades", items: vuln });
    }
  }

  // 4) Intervention details — shown if we have date/place/type.
  const inter = presentFields([
    { label: "Fecha", value: fecha },
    { label: "Lugar", value: lugar },
    { label: "Tipo de actividad", value: d.intervencion.tipoActividad || (meta.tipo === "grupal" ? "Actividad grupal" : "") },
  ]);
  sections.push({ kind: "fields", title: "Detalles de la Intervención", fields: inter });
  if (list(d.intervencion.profesionales).length) {
    sections.push({
      kind: "bullets",
      title: "Profesionales / voluntarios presentes",
      items: list(d.intervencion.profesionales),
    });
  }

  // 5) Commitment follow-up (microcredits / scholarships / work).
  const segFields = presentFields([
    { label: "Situación laboral", value: d.seguimiento.situacionLaboral },
    { label: "Desempeño académico", value: d.seguimiento.desempenoAcademico },
  ]);
  const compromisos = list(d.seguimiento.compromisos);
  if (segFields.length || compromisos.length) {
    sections.push({ kind: "fields", title: "Seguimiento de Compromisos", fields: segFields });
    if (compromisos.length) {
      sections.push({ kind: "bullets", title: "Compromisos", items: compromisos });
    }
  }

  // 6) Pending actions.
  if (list(report.accionesPendientes).length) {
    sections.push({
      kind: "bullets",
      title: "Acciones Pendientes",
      items: list(report.accionesPendientes),
    });
  }

  // 7) Qualitative narrative.
  if (has(d.narrativa)) {
    sections.push({ kind: "text", title: "Narrativa Cualitativa del Territorio", body: d.narrativa });
  }

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

/** Safe file base name, e.g. "informe-maria-garcia-2026-06-06". */
export function reportFileBase(report: FieldReport): string {
  const c = buildReportContent(report);
  const slug = c.titular
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "beneficiario";
  const d = new Date(report.createdAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `informe-${slug}-${date}`;
}
