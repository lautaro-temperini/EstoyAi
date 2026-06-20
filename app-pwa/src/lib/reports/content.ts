import type { FieldReport } from "./schema";
import type { DatosInforme } from "./schema";

/**
 * Shared report content model. The DOCX renderer builds from this single
 * structure. Every section is ALWAYS present in the output — empty fields
 * show "—" and empty lists show a single "—" entry so no section is blank.
 *
 * `id` etiqueta la sección de forma estable (independiente del título) para que
 * el filtrado por toggles (campos.ts) y la UI de edición funcionen en cualquier
 * vertical. La pantalla de edición deriva los toggles de estos ids/títulos.
 */

export interface Field {
  label: string;
  value: string;
}

export type Section = { id?: string } & (
  | { kind: "fields"; title: string; fields: Field[] }
  | { kind: "bullets"; title: string; items: string[] }
  | { kind: "text"; title: string; body: string }
);

export const REPORT_DISCLAIMER =
  "⚠ Este documento fue generado automáticamente a partir de un registro de voz y está sujeto a revisión por un profesional. Los datos deben ser verificados antes de su uso oficial.";

export interface ReportContent {
  disclaimer: string;
  titular: string;
  prioridad: FieldReport["prioridad"];
  motivoCriticidad: string;
  fecha: string;
  lugar: string;
  /** Profesional/promotor que tomó el registro (atribución). */
  registradoPor: string;
  resumenEjecutivo: string;
  sections: Section[];
  generadoEl: string;
  /** Nombre de la ONG para el pie/creator del .docx (varía por vertical). */
  orgName: string;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Fecha legible "6 de junio de 2026". Compartida por las verticales. */
export function fmtFecha(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Valor o "—" si vacío. */
export const val = (s: string | undefined | null): string =>
  s && s.trim() ? s.trim() : "—";

/** Return list items, or ["—"] when none. */
export const items = (a: string[] | undefined): string[] => {
  const r = (a ?? []).filter((x) => x && x.trim());
  return r.length ? r : ["—"];
};

export const listAsField = (a: string[] | undefined): string => {
  const r = (a ?? []).filter((x) => x && x.trim());
  return r.length ? r.join("; ") : "—";
};

/**
 * Encabezado común del informe (titular, prioridad, fecha, lugar, etc.).
 * Lo comparten todas las verticales; cada una agrega sus `sections`.
 */
export function buildReportHeader(
  report: FieldReport,
  orgName: string,
  lugarFallback?: string,
): Omit<ReportContent, "sections"> {
  const meta = report.metadatos;
  const titular =
    meta.beneficiario?.apellido && meta.beneficiario?.nombre
      ? `${meta.beneficiario.apellido} ${meta.beneficiario.nombre}`
      : meta.beneficiario?.nombre ||
        (meta.tipo === "grupal" ? "Actividad Grupal" : "Beneficiario");
  const lugar = val(
    lugarFallback || [meta.sector, meta.unidad].filter(Boolean).join(", ") || "",
  );
  return {
    disclaimer: REPORT_DISCLAIMER,
    titular,
    prioridad: report.prioridad,
    motivoCriticidad: report.motivoCriticidad?.trim() ?? "",
    fecha: fmtFecha(report.createdAt),
    lugar,
    registradoPor: val(meta.profesional),
    resumenEjecutivo: report.resumen,
    generadoEl: fmtFecha(report.createdAt),
    orgName,
  };
}

/** Pequeños Pasos: cuerpo del informe (nutrición / niñez / oficios). */
export function buildPpReportContent(report: FieldReport): ReportContent {
  const d = report.datos as DatosInforme;
  const meta = report.metadatos;

  // El nombre del beneficiario sale SIEMPRE de los campos fijos, nunca del audio.
  const titular =
    meta.beneficiario?.apellido && meta.beneficiario?.nombre
      ? `${meta.beneficiario.apellido} ${meta.beneficiario.nombre}`
      : meta.beneficiario?.nombre ||
        (meta.tipo === "grupal" ? "Actividad Grupal" : "Beneficiario");

  const lugar = val(d.intervencion.lugar || [meta.sector, meta.unidad].filter(Boolean).join(", ") || "");
  // La fecha del informe es SIEMPRE la de captura (createdAt): el LLM a veces
  // devuelve fechas erróneas (un mes mencionado en el audio — "agosto" —, un
  // formato ISO, o el literal "{Fecha del registro}" del prompt). El sistema ya
  // captura la fecha de forma confiable, así que no dependemos del modelo.
  const fecha = fmtFecha(report.createdAt);

  const sections: Section[] = [];

  // 4) Identificación y Demografía — SIEMPRE presente.
  sections.push({
    id: "identificacion",
    kind: "fields",
    title: "Identificación y Demografía",
    fields: [
      {
        label: "Nombre completo",
        value:
          meta.beneficiario?.apellido && meta.beneficiario?.nombre
            ? `${meta.beneficiario.apellido}, ${meta.beneficiario.nombre}`
            : val(meta.beneficiario?.nombre || ""),
      },
      { label: "DNI", value: val(meta.beneficiario?.dni || "") },
      { label: "Fecha de nacimiento", value: val(d.demografia.fechaNacimiento) },
      { label: "Edad", value: val(d.demografia.edad) },
      { label: "Peso", value: val(d.metricas.peso) },
      { label: "Talla", value: val(d.metricas.talla) },
    ],
  });

  sections.push({
    id: "diagnosticos",
    kind: "bullets",
    title: "Diagnósticos",
    items: items(d.metricas.diagnosticos),
  });

  // 5) Contexto Socioeconómico — SIEMPRE presente (vulnerabilidades integradas).
  sections.push({
    id: "socioeconomico",
    kind: "fields",
    title: "Contexto Socioeconómico",
    fields: [
      { label: "Condición familiar", value: val(d.socioeconomico.familia) },
      { label: "Ingresos", value: val(d.socioeconomico.ingresos) },
      { label: "Situación de vivienda", value: val(d.socioeconomico.vivienda) },
      { label: "Vulnerabilidades", value: listAsField(d.socioeconomico.vulnerabilidades) },
    ],
  });

  // 6) Detalles de la Intervención — SIEMPRE presente.
  sections.push({
    id: "intervencion",
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

  // 7) Seguimiento — SIEMPRE presente.
  sections.push({
    id: "seguimiento",
    kind: "fields",
    title: "Seguimiento",
    fields: [
      { label: "Situación laboral", value: val(d.seguimiento.situacionLaboral) },
      { label: "Desempeño académico", value: val(d.seguimiento.desempenoAcademico) },
      { label: "Compromisos", value: listAsField(d.seguimiento.compromisos) },
    ],
  });

  // 8) Acciones Pendientes — SIEMPRE presente.
  sections.push({
    id: "acciones",
    kind: "bullets",
    title: "Acciones Pendientes",
    items: items(report.accionesPendientes),
  });

  // 9) Observaciones y Contexto — SIEMPRE presente.
  sections.push({
    id: "narrativa",
    kind: "text",
    title: "Observaciones y Contexto",
    body: d.narrativa?.trim() || "—",
  });

  return {
    disclaimer: REPORT_DISCLAIMER,
    titular,
    prioridad: report.prioridad,
    motivoCriticidad: report.motivoCriticidad?.trim() ?? "",
    fecha,
    lugar,
    registradoPor: val(meta.profesional),
    resumenEjecutivo: report.resumen,
    sections,
    generadoEl: fmtFecha(report.createdAt),
    orgName: "Pequeños Pasos",
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

/**
 * Folder name for external storage (Cloudflare R2 / Podio): NombreApellidoDNI.
 * Used as the per-beneficiario subfolder inside "En Revision" / "Revisados".
 * Falls back to the informe id when beneficiario data is incomplete.
 */
export function beneficiarioFolder(report: FieldReport): string {
  const b = report.metadatos?.beneficiario;
  const cap = (s: string) => {
    const c = s
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "");
    return c ? c[0].toUpperCase() + c.slice(1) : "";
  };
  if (b?.apellido?.trim() && b?.nombre?.trim() && b?.dni?.trim()) {
    return `${cap(b.nombre)}${cap(b.apellido)}${b.dni.trim()}`;
  }
  return `informe-${report.id}`;
}
