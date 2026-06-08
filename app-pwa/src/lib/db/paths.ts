import fs from "node:fs";
import path from "node:path";
import { assertValidId } from "@/lib/api/validate";

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

function assertPathInDataRoot(resolved: string): string {
  const root = path.resolve(dataRoot()) + path.sep;
  const abs = path.resolve(resolved);
  if (!abs.startsWith(root)) {
    throw new Error("path fuera de data root");
  }
  return abs;
}

export function audioPathFor(id: string): string {
  assertValidId(id);
  return assertPathInDataRoot(path.join(audioDir(), `${id}.wav`));
}

export function docxPathFor(id: string): string {
  assertValidId(id);
  return assertPathInDataRoot(path.join(docxDir(), `${id}.docx`));
}

/** Ensure volume directories exist before first write. */
export function ensureDataDirs(): void {
  for (const dir of [audioDir(), docxDir(), sqliteDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
