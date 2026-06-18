/**
 * Logger estructurado mínimo (una línea JSON por evento) para que los logs del
 * contenedor sean grepables: `docker compose logs app-pwa | grep '"scope":"n8n"'`.
 * No es un stack de observabilidad — es lo justo para diagnosticar el pipeline
 * en la sede sin servicios externos. Nivel: info | warn | error.
 */
type Level = "info" | "warn" | "error";

export function logEvent(
  level: Level,
  scope: string,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, msg, ...extra });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
