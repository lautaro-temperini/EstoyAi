const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Reject any id that is not a strict UUID v4 (prevents path traversal). */
export function assertValidId(id: string): void {
  if (!UUID_V4.test(id)) {
    throw new Error("id inválido");
  }
}
