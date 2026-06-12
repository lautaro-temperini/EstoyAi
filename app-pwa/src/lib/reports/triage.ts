import type { InformeRow } from "@/lib/db/sqlite";
import type { Prioridad, Programa } from "./schema";

/**
 * Modelo de la vista de triage del coordinador. Transforma las filas crudas de
 * SQLite en buckets accionables: "qué necesita atención hoy".
 *
 * Distinción clave: problema CLÍNICO ≠ problema TÉCNICO.
 *   - `ERROR` es un fallo del pipeline → acción: reintentar el informe.
 *   - `ALTA` es criticidad clínica → acción: contactar a la familia.
 * Son respuestas distintas del coordinador, así que van en buckets separados y
 * nunca se mezclan en "atención hoy".
 */

export interface TriageItem {
  id: string;
  estado: InformeRow["estado"];
  prioridad: Prioridad | null;
  motivoCriticidad: string;
  resumen: string;
  beneficiario: { nombre: string; apellido: string; dni: string } | null;
  programa: Programa | null;
  accionesPendientes: string[];
  createdAt: number;
  /** El .docx ya está disponible para descargar. */
  tieneDocx: boolean;
  /** Mensaje técnico del fallo del pipeline (solo en estado ERROR). */
  error: string | null;
}

export interface TriageBuckets {
  /** CLÍNICO: prioridad ALTA o con acciones pendientes. NO incluye ERROR. */
  atencionHoy: TriageItem[];
  /** TÉCNICO: estado ERROR (acción: reintentar). */
  errores: TriageItem[];
  alta: TriageItem[];
  media: TriageItem[];
  baja: TriageItem[];
  /** RECIBIDO/EXTRAIDO sin docx todavía (procesando). */
  enProceso: TriageItem[];
  resumen: {
    alta: number;
    media: number;
    baja: number;
    pendientes: number;
    errores: number;
    total: number;
  };
}

function toItem(row: InformeRow): TriageItem {
  const j = row.informeJson;
  const meta = row.metadata;
  return {
    id: row.id,
    estado: row.estado,
    prioridad: j?.prioridad ?? null,
    motivoCriticidad: j?.motivoCriticidad ?? "",
    resumen: j?.resumen ?? "",
    beneficiario: meta?.beneficiario ?? j?.metadatos?.beneficiario ?? null,
    programa: meta?.programa ?? j?.metadatos?.programa ?? null,
    accionesPendientes: (j?.accionesPendientes ?? []).filter((a) => a && a.trim()),
    createdAt: row.createdAt,
    tieneDocx: row.estado === "LISTO",
    error: row.error,
  };
}

export function buildTriage(rows: InformeRow[]): TriageBuckets {
  const items = rows.map(toItem);

  const errores = items.filter((i) => i.estado === "ERROR");
  // "Procesando": recibido/extraído que todavía no llegó a LISTO ni falló.
  const enProceso = items.filter(
    (i) => i.estado === "RECIBIDO" || i.estado === "EXTRAIDO",
  );
  // Solo los informes con extracción válida (LISTO) entran al triage por prioridad.
  const conPrioridad = items.filter((i) => i.estado === "LISTO");

  const alta = conPrioridad.filter((i) => i.prioridad === "ALTA");
  const media = conPrioridad.filter((i) => i.prioridad === "MEDIA");
  const baja = conPrioridad.filter((i) => i.prioridad === "BAJA");

  // Atención clínica de hoy: ALTA primero, luego cualquier informe con acciones
  // pendientes que no sea ya ALTA. Sin duplicados, sin errores técnicos.
  const conAcciones = conPrioridad.filter(
    (i) => i.prioridad !== "ALTA" && i.accionesPendientes.length > 0,
  );
  const atencionHoy = [...alta, ...conAcciones];

  const pendientes = conPrioridad.filter(
    (i) => i.accionesPendientes.length > 0,
  ).length;

  return {
    atencionHoy,
    errores,
    alta,
    media,
    baja,
    enProceso,
    resumen: {
      alta: alta.length,
      media: media.length,
      baja: baja.length,
      pendientes,
      errores: errores.length,
      total: items.length,
    },
  };
}
