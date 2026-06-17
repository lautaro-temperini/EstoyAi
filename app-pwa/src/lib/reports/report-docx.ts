import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  TableOfContents,
  Footer,
  PageNumber,
  NumberFormat,
} from "docx";
import type { FieldReport } from "./schema";
import { type ReportContent, type Section } from "./content";
import { buildReportContent } from "./verticals";

/**
 * Editable Word (.docx) version of the field report.
 *
 * Format spec:
 *  - Font: Calibri 11 pt body, 16 pt Heading 1, 14 pt Heading 2
 *  - Margins: 2.5 cm all sides
 *  - Line spacing: 1.15
 *  - Alignment: left
 *  - Automatic page numbers (footer, centre)
 *  - Table of contents (inserted after cover; Word updates it on open)
 */

// 2.5 cm in twips (1 inch = 1440 twips; 1 cm ≈ 567 twips)
const MARGIN_TWIPS = Math.round(2.5 * 567); // 1418

const PRIMARY = "0040A1";
const MUTED = "424654";
const TEXT = "0D1C2E";
const PRIORITY_COLOR: Record<"ALTA" | "MEDIA" | "BAJA", string> = {
  ALTA: "BA1A1A",
  MEDIA: "865400",
  BAJA: "006C49",
};

// Half-points: 11 pt body = 22, 16 pt H1 = 32, 14 pt H2 = 28
const SZ_BODY = 22;   // 11 pt
const SZ_H1   = 32;   // 16 pt
const SZ_H2   = 28;   // 14 pt
const SZ_META = 20;   // 10 pt (fecha/lugar, pie)
const SZ_DISC = 18;   // 9 pt (disclaimer)

// Line spacing 1.15 in twips (240 twips = single; 1.15 × 240 = 276)
const LINE_SPACING = { line: 276, lineRule: "auto" as const };

const FONT = "Calibri";

/** Heading 1 — section title, 16 pt Calibri, primary colour, border below. */
function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 80, ...LINE_SPACING },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C3C6D6", space: 2 } },
    children: [
      new TextRun({ text: title, bold: true, size: SZ_H1, color: PRIMARY, font: FONT }),
    ],
  });
}

/** Heading 2 — sub-section label, 14 pt. Not currently used but exported for future use. */
function subHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 60, ...LINE_SPACING },
    children: [
      new TextRun({ text: title, bold: true, size: SZ_H2, color: PRIMARY, font: FONT }),
    ],
  });
}
// subHeading kept for future use — suppress unused warning
void subHeading;

function fieldParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40, ...LINE_SPACING },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: MUTED, size: SZ_BODY, font: FONT }),
      new TextRun({ text: value, color: TEXT, size: SZ_BODY, font: FONT }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 30, ...LINE_SPACING },
    children: [new TextRun({ text, color: TEXT, size: SZ_BODY, font: FONT })],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60, ...LINE_SPACING },
    children: [new TextRun({ text, color: TEXT, size: SZ_BODY, font: FONT })],
  });
}

function renderSection(section: Section): Paragraph[] {
  const out: Paragraph[] = [sectionHeading(section.title)];
  if (section.kind === "fields") {
    out.push(...section.fields.map((f) => fieldParagraph(f.label, f.value)));
  } else if (section.kind === "bullets") {
    out.push(...section.items.map((i) => bulletParagraph(i)));
  } else {
    out.push(bodyText(section.body));
  }
  return out;
}

function buildDocumentFromContent(c: ReportContent): Document {
  const children: Paragraph[] = [
    // ── Portada ──────────────────────────────────────────────────────────────
    new Paragraph({
      spacing: { after: 20, ...LINE_SPACING },
      children: [
        new TextRun({
          text: "INFORME DE CAMPO",
          bold: true,
          size: SZ_META,
          color: MUTED,
          characterSpacing: 12,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60, ...LINE_SPACING },
      children: [
        new TextRun({ text: c.titular, bold: true, size: SZ_H1 + 8, color: PRIMARY, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60, ...LINE_SPACING },
      children: [
        new TextRun({
          text: [c.fecha, c.lugar].filter(Boolean).join("  ·  "),
          color: MUTED,
          size: SZ_META,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60, ...LINE_SPACING },
      children: [
        new TextRun({ text: "Registrado por: ", bold: true, size: SZ_META, color: MUTED, font: FONT }),
        new TextRun({ text: c.registradoPor, size: SZ_META, color: MUTED, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200, ...LINE_SPACING },
      children: [
        new TextRun({ text: "Prioridad: ", bold: true, size: SZ_BODY, color: MUTED, font: FONT }),
        new TextRun({
          text: c.prioridad,
          bold: true,
          size: SZ_BODY,
          color: PRIORITY_COLOR[c.prioridad],
          font: FONT,
        }),
        ...(c.motivoCriticidad
          ? [
              new TextRun({
                text: `  —  ${c.motivoCriticidad}`,
                italics: true,
                size: SZ_META,
                color: MUTED,
                font: FONT,
              }),
            ]
          : []),
      ],
    }),

    // ── Tabla de contenido ───────────────────────────────────────────────────
    // Word la rellena al abrir el documento (F9 para actualizar).
    new TableOfContents("Tabla de contenido", {
      hyperlink: true,
      headingStyleRange: "1-2",
      stylesWithLevels: [],
    }) as unknown as Paragraph,

    // ── Resumen ejecutivo ────────────────────────────────────────────────────
    sectionHeading("Resumen Ejecutivo"),
    bodyText(c.resumenEjecutivo),

    // ── Secciones del informe ────────────────────────────────────────────────
    ...c.sections.flatMap(renderSection),

    // ── Pie del documento ────────────────────────────────────────────────────
    new Paragraph({
      spacing: { before: 280, ...LINE_SPACING },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: `Generado en sede · ${c.orgName} · ${c.generadoEl}`,
          size: SZ_META,
          italics: true,
          color: MUTED,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "C3C6D6", space: 6 } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "⚠ Este documento fue generado automáticamente a partir de un registro de voz y está sujeto a revisión por un profesional. Los datos deben ser verificados antes de su uso oficial.",
          size: SZ_DISC,
          color: "9AA0B0",
          italics: true,
          font: FONT,
        }),
      ],
    }),
  ];

  return new Document({
    creator: c.orgName,
    title: `Informe de Campo — ${c.titular}`,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ_BODY, color: TEXT },
          paragraph: { spacing: { line: 276, lineRule: "auto" }, alignment: AlignmentType.LEFT },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SZ_H1, bold: true, color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 80, line: 276, lineRule: "auto" } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SZ_H2, bold: true, color: PRIMARY },
          paragraph: { spacing: { before: 160, after: 60, line: 276, lineRule: "auto" } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_TWIPS,
              bottom: MARGIN_TWIPS,
              left: MARGIN_TWIPS,
              right: MARGIN_TWIPS,
            },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: SZ_DISC, font: FONT, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

function buildDocument(report: FieldReport): Document {
  return buildDocumentFromContent(buildReportContent(report));
}

/** Render the report to an editable .docx Blob (client-side). */
export async function renderReportDocxBlob(report: FieldReport): Promise<Blob> {
  return Packer.toBlob(buildDocument(report));
}

/** Render the report to an editable .docx Buffer (server-side, API route). */
export async function renderReportDocxBuffer(report: FieldReport): Promise<Buffer> {
  return Packer.toBuffer(buildDocument(report));
}

/** Render with pre-built (and optionally filtered) content — used by generar-docx. */
export async function renderReportDocxBufferFromContent(
  content: ReportContent,
): Promise<Buffer> {
  return Packer.toBuffer(buildDocumentFromContent(content));
}
