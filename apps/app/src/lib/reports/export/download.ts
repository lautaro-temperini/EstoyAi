"use client";

import type { FieldReport } from "../schema";
import { reportFileBase } from "./content";

/**
 * Download the report as PDF or editable Word. The heavy renderers
 * (@react-pdf/renderer, docx) are dynamically imported here so they stay out of
 * the main bundle and only load when the operator actually exports.
 */
export type ReportFormat = "pdf" | "docx";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadReport(report: FieldReport, format: ReportFormat): Promise<void> {
  const base = reportFileBase(report);
  if (format === "pdf") {
    const { renderReportPdfBlob } = await import("./report-pdf");
    triggerDownload(await renderReportPdfBlob(report), `${base}.pdf`);
  } else {
    const { renderReportDocxBlob } = await import("./report-docx");
    triggerDownload(await renderReportDocxBlob(report), `${base}.docx`);
  }
}
