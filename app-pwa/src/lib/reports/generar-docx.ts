import fs from "node:fs/promises";
import type { FieldReport } from "./schema";
import { buildReportContent } from "./content";
import { filterReportContent, type CamposConfig } from "./campos";
import { renderReportDocxBufferFromContent } from "./report-docx";
import { docxPathFor } from "@/lib/db/paths";
import { setInformeError, setInformeListo } from "@/lib/db/sqlite";

/**
 * Build the .docx from stored extraction JSON, write to the shared volume,
 * and mark the informe LISTO. Shared by generar-docx and campos routes.
 */
export async function generarDocxParaInforme(
  id: string,
  report: FieldReport,
  campos: CamposConfig,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!report.transcripcion?.trim()) {
    return { ok: false, error: "falta transcripción", status: 400 };
  }

  try {
    const content = filterReportContent(buildReportContent(report), campos);
    const buffer = await renderReportDocxBufferFromContent(content);
    await fs.writeFile(docxPathFor(id), buffer);
    setInformeListo(id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setInformeError(id, msg);
    return { ok: false, error: msg, status: 500 };
  }
}
