import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { FieldReport } from "../schema";
import { buildReportContent, type Section } from "./content";

/**
 * Editable Word (.docx) version of the one-page field report. Same content as
 * the PDF (built from buildReportContent) but as real OpenXML the user can edit
 * and re-save in Word / Google Docs. Built client-side via Packer.toBlob.
 */

const PRIMARY = "0040A1";
const MUTED = "424654";
const TEXT = "0D1C2E";
const PRIORITY_COLOR: Record<"ALTA" | "MEDIA" | "BAJA", string> = {
  ALTA: "BA1A1A",
  MEDIA: "865400",
  BAJA: "006C49",
};

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C3C6D6", space: 2 } },
    children: [new TextRun({ text: title, bold: true, size: 22, color: PRIMARY })],
  });
}

function fieldParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: MUTED, size: 19 }),
      new TextRun({ text: value, color: TEXT, size: 19 }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 30 },
    children: [new TextRun({ text, color: TEXT, size: 19 })],
  });
}

function renderSection(section: Section): Paragraph[] {
  const out: Paragraph[] = [sectionHeading(section.title)];
  if (section.kind === "fields") {
    out.push(...section.fields.map((f) => fieldParagraph(f.label, f.value)));
  } else if (section.kind === "bullets") {
    out.push(...section.items.map((i) => bullet(i)));
  } else {
    out.push(
      new Paragraph({ children: [new TextRun({ text: section.body, color: TEXT, size: 19 })] }),
    );
  }
  return out;
}

/** Render the report to an editable .docx Blob (client-side). */
export async function renderReportDocxBlob(report: FieldReport): Promise<Blob> {
  const c = buildReportContent(report);

  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: "INFORME DE CAMPO",
          bold: true,
          size: 16,
          color: MUTED,
          characterSpacing: 12,
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: c.titular, bold: true, size: 40, color: PRIMARY })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: [c.fecha, c.lugar].filter(Boolean).join("  ·  "),
          color: MUTED,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: "Prioridad: ", bold: true, size: 19, color: MUTED }),
        new TextRun({ text: c.prioridad, bold: true, size: 19, color: PRIORITY_COLOR[c.prioridad] }),
      ],
    }),
    // Executive summary — first.
    sectionHeading("Resumen Ejecutivo"),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: c.resumenEjecutivo, size: 22, color: TEXT })],
    }),
    ...c.sections.flatMap(renderSection),
    new Paragraph({
      spacing: { before: 240 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: `Generado en campo con inferencia local · Smart NGO Voice Reports · ${c.generadoEl}`,
          size: 14,
          italics: true,
          color: MUTED,
        }),
      ],
    }),
  ];

  const doc = new Document({
    creator: "Smart NGO Voice Reports",
    title: `Informe de Campo — ${c.titular}`,
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
