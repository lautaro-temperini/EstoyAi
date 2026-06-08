import fs from "node:fs";
import path from "node:path";

/** Shared data root (audio, docx, sqlite volumes). */
export function dataRoot(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "..", "data");
}

export function audioDir(): string {
  return path.join(dataRoot(), "audio");
}

export function docxDir(): string {
  return path.join(dataRoot(), "docx");
}

export function sqliteDir(): string {
  return path.join(dataRoot(), "sqlite");
}

export function sqlitePath(): string {
  return path.join(sqliteDir(), "informes.db");
}

export function audioPathFor(id: string): string {
  return path.join(audioDir(), `${id}.wav`);
}

export function docxPathFor(id: string): string {
  return path.join(docxDir(), `${id}.docx`);
}

/** Ensure volume directories exist before first write. */
export function ensureDataDirs(): void {
  for (const dir of [audioDir(), docxDir(), sqliteDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
