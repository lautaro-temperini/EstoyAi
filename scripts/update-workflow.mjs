#!/usr/bin/env node
/**
 * Regenera n8n/workflows/registro.json y lo sube a n8n vía REST API.
 *
 * Autenticación: la API pública de n8n (/api/v1/*) usa una API key en el
 * header X-N8N-API-KEY — NO el basic auth del editor. Generar la key en
 * n8n → Settings → API → Create API Key, y guardarla en .env como N8N_API_KEY.
 * Requiere Node 22 (fetch nativo).
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
const N8N_URL = "http://localhost:5678";

// ── Leer .env ────────────────────────────────────────────────────────────────
function readEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)/);
    if (!m) continue;
    // Quitar comentario inline y espacios
    env[m[1]] = m[2].replace(/\s*#.*$/, "").trim();
  }
  return env;
}

// ── HTTP con API key (X-N8N-API-KEY) ─────────────────────────────────────────
async function api(method, path, apiKey, body) {
  const headers = {
    "X-N8N-API-KEY": apiKey,
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  const res = await fetch(`${N8N_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    json: () => JSON.parse(text),
    text,
  };
}

// La API pública rechaza propiedades read-only (id, active, tags, etc.) en el
// body de POST/PUT. Mandamos solo lo que acepta el schema del endpoint.
function cleanWorkflow(w) {
  return {
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: w.settings ?? {},
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Actualizar workflow n8n — Pequeños Pasos");
  console.log("══════════════════════════════════════════════\n");

  const env = readEnv();
  const N8N_API_KEY = env.N8N_API_KEY || process.env.N8N_API_KEY || "";
  if (!N8N_API_KEY) {
    console.error("  ✗ Falta N8N_API_KEY.");
    console.error("    1. Abrí n8n: http://localhost:5678");
    console.error("    2. Settings → API → Create API Key");
    console.error("    3. Copiá la key al archivo .env:  N8N_API_KEY=...");
    console.error();
    process.exit(1);
  }

  // ── Paso 1: Regenerar JSON ──────────────────────────────────────────────
  console.log("1/3  Regenerando registro.json desde assemble.ts / schema.ts…");
  try {
    execSync(`node "${path.join(__dirname, "gen-n8n-workflow.mjs")}"`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch {
    console.error("     ✗ Falló gen-n8n-workflow.mjs — revisá errores arriba.");
    process.exit(1);
  }
  const workflowJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "n8n", "workflows", "registro.json"), "utf8"),
  );
  console.log("     ✓ registro.json regenerado.\n");

  // ── Paso 2: Buscar workflow existente por nombre ────────────────────────
  console.log(`2/3  Conectando a n8n en ${N8N_URL}…`);
  let listRes;
  try {
    listRes = await api("GET", "/api/v1/workflows", N8N_API_KEY);
  } catch (e) {
    console.error(`\n     ✗ No se pudo conectar a n8n.`);
    console.error(`       ¿Está corriendo? →  docker compose ps n8n`);
    console.error(`       Error: ${e.message}\n`);
    process.exit(1);
  }

  if (listRes.status === 401) {
    console.error("\n     ✗ API key inválida o vencida.");
    console.error("       Generá una nueva en n8n → Settings → API → Create API Key");
    console.error("       y actualizá N8N_API_KEY en el archivo .env\n");
    process.exit(1);
  }
  if (!listRes.ok) {
    console.error(`\n     ✗ n8n respondió HTTP ${listRes.status}.`);
    console.error(`       Verificá que el servicio esté sano: docker compose ps n8n\n`);
    process.exit(1);
  }

  const list = listRes.json();
  const arr = Array.isArray(list) ? list : (list.data || []);
  const existing = arr.find((w) => w.name === WORKFLOW_NAME);
  let wfId;

  if (existing) {
    wfId = existing.id;
    console.log(`     Workflow encontrado (id=${wfId}). Actualizando…`);
    const upRes = await api("PUT", `/api/v1/workflows/${wfId}`, N8N_API_KEY, cleanWorkflow(workflowJson));
    if (!upRes.ok) {
      console.error(`\n     ✗ Error al actualizar (HTTP ${upRes.status}).`);
      console.error("       Importá a mano: n8n → Workflows → Import from file");
      console.error("       Archivo: n8n/workflows/registro.json\n");
      process.exit(1);
    }
    console.log("     ✓ Workflow actualizado.");
  } else {
    console.log("     Workflow no encontrado. Creando uno nuevo…");
    const createRes = await api("POST", "/api/v1/workflows", N8N_API_KEY, cleanWorkflow(workflowJson));
    if (!createRes.ok) {
      console.error(`\n     ✗ Error al crear el workflow (HTTP ${createRes.status}).`);
      console.error("       Importá a mano: n8n → Workflows → Import from file");
      console.error("       Archivo: n8n/workflows/registro.json\n");
      process.exit(1);
    }
    wfId = createRes.json().id;
    console.log(`     ✓ Workflow creado (id=${wfId}).`);
  }
  console.log();

  // ── Paso 3: Activar ─────────────────────────────────────────────────────
  console.log("3/3  Activando el workflow…");
  if (wfId) {
    const actRes = await api("POST", `/api/v1/workflows/${wfId}/activate`, N8N_API_KEY);
    if (actRes.ok) {
      console.log("     ✓ Workflow activo y listo para recibir registros.");
    } else {
      console.log("     ⚠ No se pudo activar automáticamente.");
      console.log("       Activalo a mano en n8n (toggle arriba a la derecha del workflow).");
    }
  } else {
    console.log("     ⚠ Activalo a mano en n8n (toggle arriba a la derecha del workflow).");
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  ✓ Listo.");
  console.log("══════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(`\n  ✗ Error inesperado: ${e.message}\n`);
  process.exit(1);
});
