#!/usr/bin/env node
/**
 * Regenera n8n/workflows/registro.json y lo importa a n8n usando el CLI interno
 * del contenedor (n8n import:workflow) — el mismo motor que "Import from file"
 * de la UI. NO usa la REST API ni API key: corre `docker compose exec n8n ...`.
 *
 * El archivo ya está montado en el contenedor vía docker-compose:
 *   ./n8n/workflows  →  /home/node/workflows  (ro)
 *
 * Requiere Node 22, Docker Desktop corriendo y el contenedor n8n levantado.
 *
 * Uso directo:  node scripts/update-workflow.mjs
 * Desde script: scripts/update-workflow.sh  |  scripts\update-workflow.bat
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORKFLOW_NAME = "Pequeños Pasos — registro";
const WORKFLOW_FILE = path.join(ROOT, "n8n", "workflows", "registro.json");
// Ruta del mismo archivo VISTA DESDE DENTRO del contenedor (volumen montado).
const WORKFLOW_IN_CONTAINER = "/home/node/workflows/registro.json";

// Ejecuta un comando y devuelve stdout (string). `silent` oculta la salida.
function run(cmd, { silent = false } = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: silent ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  });
}

// Corre el CLI de n8n dentro del contenedor. -T = sin TTY (modo script).
function n8nCli(args, opts) {
  return run(`docker compose exec -T n8n n8n ${args}`, opts);
}

// list:workflow imprime líneas "<id>|<nombre>". Devuelve el id por nombre, o null.
function findWorkflowId() {
  let out;
  try {
    out = n8nCli("list:workflow", { silent: true });
  } catch {
    return null; // sin workflows todavía, o el comando falló (se maneja afuera)
  }
  for (const line of out.split(/\r?\n/)) {
    const i = line.indexOf("|");
    if (i === -1) continue;
    const id = line.slice(0, i).trim();
    const name = line.slice(i + 1).trim();
    if (name === WORKFLOW_NAME) return id;
  }
  return null;
}

// Inyecta un id estable en el JSON para que import:workflow ACTUALICE en vez de
// duplicar. Escribe sobre el archivo del host (el contenedor lo lee por el mount).
function injectId(id) {
  const wf = JSON.parse(fs.readFileSync(WORKFLOW_FILE, "utf8"));
  wf.id = id;
  fs.writeFileSync(WORKFLOW_FILE, JSON.stringify(wf, null, 2) + "\n", "utf8");
}

function fail(msg, hint) {
  console.error(`\n  ✗ ${msg}`);
  if (hint) console.error(`    ${hint}`);
  console.error();
  process.exit(1);
}

function main() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Actualizar workflow n8n — Pequeños Pasos");
  console.log("══════════════════════════════════════════════\n");

  // ── Paso 1: Regenerar JSON ──────────────────────────────────────────────
  console.log("1/4  Regenerando registro.json desde assemble.ts / schema.ts…");
  try {
    run(`node "${path.join(__dirname, "gen-n8n-workflow.mjs")}"`);
  } catch {
    fail("Falló gen-n8n-workflow.mjs — revisá los errores de arriba.");
  }
  console.log("     ✓ registro.json regenerado.\n");

  // ── Verificar que el contenedor n8n responda ────────────────────────────
  console.log("2/4  Verificando que el contenedor n8n esté corriendo…");
  try {
    n8nCli("--version", { silent: true });
  } catch {
    fail(
      "No se pudo ejecutar el CLI de n8n en el contenedor.",
      "¿Docker está abierto y n8n levantado?  →  docker compose ps n8n",
    );
  }
  console.log("     ✓ n8n responde.\n");

  // ── Paso 2: Si ya existe, reusar su id para actualizar (no duplicar) ─────
  const existingId = findWorkflowId();
  if (existingId) {
    console.log(`3/4  Workflow existente (id=${existingId}). Actualizando…`);
    injectId(existingId);
  } else {
    console.log("3/4  Workflow nuevo. Importando por primera vez…");
  }
  try {
    n8nCli(`import:workflow --input=${WORKFLOW_IN_CONTAINER}`);
  } catch {
    fail(
      "Falló import:workflow.",
      "Como alternativa, importá a mano: n8n → Workflows → Import from file → n8n/workflows/registro.json",
    );
  }
  const wfId = existingId || findWorkflowId();
  console.log("     ✓ Workflow importado.\n");

  // ── Paso 3: Activar + reiniciar n8n para registrar el webhook ───────────
  console.log("4/4  Activando el workflow y reiniciando n8n…");
  if (wfId) {
    try {
      n8nCli(`update:workflow --id=${wfId} --active=true`, { silent: true });
    } catch {
      console.log("     ⚠ No se pudo activar por CLI — activalo a mano en la UI.");
    }
  }
  // n8n registra los webhooks al arrancar; un restart asegura que /webhook/registro quede vivo.
  try {
    run("docker compose restart n8n", { silent: true });
  } catch {
    console.log("     ⚠ No se pudo reiniciar n8n — reiniciá a mano: docker compose restart n8n");
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  ✓ Listo. El workflow está activo.");
  console.log("    (n8n tarda ~30 s en volver a estar disponible)");
  console.log("══════════════════════════════════════════════\n");
}

main();
