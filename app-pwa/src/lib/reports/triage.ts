import type { InformeRow } from "@/lib/db/sqlite";
import type { Prioridad, Programa } from "./schema";

/**
 * Modelo de la vista de coordinación. Aplana las filas de SQLite en items
 * ordenables y filtrables. La vista es cronológica por defecto; los filtros
 * (criticidad, beneficiario) se aplican del lado del cliente.
 *
 * `categoria` resume el estado para los chips de filtro:
 *   - "ALTA"/"MEDIA"/"BAJA": informe LISTO con esa prioridad clínica.
 *   - "error": fallo técnico del pipeline (acción: reintentar).
 *   - "proceso": recibido/extraído, todavía sin prioridad.
 */

export type TriageCategoria = Prioridad | "error" | "proceso";

export interface TriageItem {
  id: string;
  estado: InformeRow["estado"];
  categoria: TriageCategoria;
  prioridad: Prioridad | null;
  motivoCriticidad: string;
  resumen: string;
  beneficiario: { nombre: string; apellido: string; dni: string } | null;
  programa: Programa | null;
  /** Profesional/promotor que tomó el registro (atribución). */
  profesional: string | null;
  accionesPendientes: string[];
  createdAt: number;
  /** El .docx ya está disponible para descargar. */
  tieneDocx: boolean;
  /** Mensaje técnico del fallo del pipeline (solo en estado ERROR). */
  error: string | null;
}

function categoriaOf(estado: InformeRow["estado"], prioridad: Prioridad | null): TriageCategoria {
  if (estado === "ERROR") return "error";
  if (estado === "LISTO" && prioridad) return prioridad;
  return "proceso";
}

export function toTriageItem(row: InformeRow): TriageItem {
  const j = row.informeJson;
  const meta = row.metadata;
  const prioridad = row.estado === "LISTO" ? j?.prioridad ?? null : null;
  return {
    id: row.id,
    estado: row.estado,
    categoria: categoriaOf(row.estado, prioridad),
    prioridad,
    motivoCriticidad: j?.motivoCriticidad ?? "",
    resumen: j?.resumen ?? "",
    beneficiario: meta?.beneficiario ?? j?.metadatos?.beneficiario ?? null,
    programa: meta?.programa ?? j?.metadatos?.programa ?? null,
    profesional: meta?.profesional ?? j?.metadatos?.profesional ?? null,
    accionesPendientes: (j?.accionesPendientes ?? []).filter((a) => a && a.trim()),
    createdAt: row.createdAt,
    tieneDocx: row.estado === "LISTO",
    error: row.error,
  };
}

/** Items aplanados y ordenados cronológicamente (más reciente primero). */
export function listTriageItems(rows: InformeRow[]): TriageItem[] {
  return rows.map(toTriageItem).sort((a, b) => b.createdAt - a.createdAt);
}

export interface TriageCounts {
  total: number;
  ALTA: number;
  MEDIA: number;
  BAJA: number;
  error: number;
}

export function countByCategoria(items: TriageItem[]): TriageCounts {
  return {
    total: items.length,
    ALTA: items.filter((i) => i.categoria === "ALTA").length,
    MEDIA: items.filter((i) => i.categoria === "MEDIA").length,
    BAJA: items.filter((i) => i.categoria === "BAJA").length,
    error: items.filter((i) => i.categoria === "error").length,
  };
}
