import Database from "better-sqlite3";
import { ensureDataDirs, sqlitePath } from "./paths";
import type { FieldReport, ReportMetadata } from "@/lib/reports/schema";
import type { CamposConfig } from "@/lib/reports/campos";
import { DEFAULT_CAMPOS } from "@/lib/reports/campos";

/** Server-side processing lifecycle (distinct from client FieldReport.estado). */
export type InformeEstado = "RECIBIDO" | "EXTRAIDO" | "LISTO" | "ERROR";

export interface InformeRow {
  id: string;
  estado: InformeEstado;
  audioPath: string | null;
  metadata: ReportMetadata | null;
  informeJson: FieldReport | null;
  campos: CamposConfig;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface InformeDbRow {
  id: string;
  estado: string;
  audio_path: string | null;
  metadata: string | null;
  informe_json: string | null;
  campos: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    ensureDataDirs();
    db = new Database(sqlitePath());
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.exec(`
      CREATE TABLE IF NOT EXISTS informes (
        id TEXT PRIMARY KEY,
        estado TEXT NOT NULL DEFAULT 'RECIBIDO',
        audio_path TEXT,
        metadata TEXT,
        informe_json TEXT,
        campos TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }
  return db;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function rowToInforme(r: InformeDbRow): InformeRow {
  return {
    id: r.id,
    estado: r.estado as InformeEstado,
    audioPath: r.audio_path,
    metadata: parseJson<ReportMetadata>(r.metadata),
    informeJson: parseJson<FieldReport>(r.informe_json),
    campos: parseJson<CamposConfig>(r.campos) ?? DEFAULT_CAMPOS,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getInforme(id: string): InformeRow | null {
  const row = getDb()
    .prepare(
      `SELECT id, estado, audio_path, metadata, informe_json, campos, error, created_at, updated_at
       FROM informes WHERE id = ?`,
    )
    .get(id) as InformeDbRow | undefined;
  return row ? rowToInforme(row) : null;
}

/**
 * Inserta el informe en estado RECIBIDO. Idempotente por id: si la fila ya
 * existe (el cliente puede subir el mismo audio dos veces — Background Sync +
 * flush inmediato en paralelo), NO la pisa y devuelve created=false para que
 * el caller no vuelva a disparar el webhook de n8n. La verificación es
 * atómica: better-sqlite3 es síncrono y único escritor del proceso.
 */
export function insertInformeRecibido(input: {
  id: string;
  audioPath: string;
  metadata: ReportMetadata;
}): { informe: InformeRow; created: boolean } {
  const now = Date.now();
  const result = getDb()
    .prepare(
      `INSERT INTO informes (id, estado, audio_path, metadata, campos, created_at, updated_at)
       VALUES (?, 'RECIBIDO', ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run(
      input.id,
      input.audioPath,
      JSON.stringify(input.metadata),
      JSON.stringify(DEFAULT_CAMPOS),
      now,
      now,
    );
  return { informe: getInforme(input.id)!, created: result.changes > 0 };
}

export function upsertInformeExtraido(input: {
  id: string;
  informeJson: FieldReport;
}): InformeRow | null {
  const now = Date.now();
  const result = getDb()
    .prepare(
      `UPDATE informes
       SET estado = 'EXTRAIDO', informe_json = ?, error = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .run(JSON.stringify(input.informeJson), now, input.id);
  if (result.changes === 0) return null;
  return getInforme(input.id);
}

export function setInformeCampos(id: string, campos: CamposConfig): InformeRow | null {
  const now = Date.now();
  const result = getDb()
    .prepare(`UPDATE informes SET campos = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(campos), now, id);
  if (result.changes === 0) return null;
  return getInforme(id);
}

export function setInformeListo(id: string): InformeRow | null {
  const now = Date.now();
  const result = getDb()
    .prepare(`UPDATE informes SET estado = 'LISTO', error = NULL, updated_at = ? WHERE id = ?`)
    .run(now, id);
  if (result.changes === 0) return null;
  return getInforme(id);
}

/** Permanently delete an informe row. Returns true if a row was removed. */
export function deleteInforme(id: string): boolean {
  const result = getDb().prepare(`DELETE FROM informes WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function setInformeError(id: string, error: string): InformeRow | null {
  const now = Date.now();
  const result = getDb()
    .prepare(`UPDATE informes SET estado = 'ERROR', error = ?, updated_at = ? WHERE id = ?`)
    .run(error, now, id);
  if (result.changes === 0) return null;
  return getInforme(id);
}
