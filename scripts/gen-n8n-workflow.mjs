/**
 * Generador del workflow n8n `registro.json`.
 *
 * Por qué un generador en vez de editar el JSON a mano: los nodos Code embeben
 * el SYSTEM_PROMPT y el EXTRACTION_JSON_SCHEMA, que llevan comillas y saltos de
 * línea. Construirlos como JS real y serializar con JSON.stringify elimina todo
 * el escapado manual y mantiene una sola fuente de verdad.
 *
 * Mantener SYSTEM_PROMPT y EXTRACTION_JSON_SCHEMA en sync con
 * app-pwa/src/lib/reports/assemble.ts y schema.ts.
 *
 * Uso:  node scripts/gen-n8n-workflow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "n8n", "workflows", "registro.json");

// SYNC: este prompt debe mantenerse idéntico en scripts/gen-n8n-workflow.mjs y assemble.ts
const REGLAS_ABSOLUTAS = [
  "Convierte la transcripción de un mensaje de voz en un informe de campo estructurado para una ONG.",
  "Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja \"\" (texto) o [] (lista). No uses vocabulario que no esté en el texto.",
  "Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. \"Mensaje de prueba sin información operativa\") y deja el resto vacío.",
];

const ESTRUCTURA_CAMPOS = [
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: ALTA solo si se menciona explícitamente una emergencia médica o de seguridad; MEDIA si hay acciones de seguimiento pendientes o se menciona una visita de control; BAJA solo si es informativo sin ninguna acción requerida.",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  "- entidades.fechas: fechas mencionadas; convierte las relativas (\"hoy\", \"el martes\") a fecha absoluta usando la \"Fecha del registro\"; si no hay, [].",
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (columna vertebral del registro; deja vacío lo no mencionado):",
  "- datos.demografia: nombre, edad, fechaNacimiento del beneficiario; esMenor=true SOLO si se indica o se deduce que es menor de edad.",
  "- datos.metricas: peso y talla (antropométricos para nutrición), diagnosticos (lista de diagnósticos médicos específicos: oncología, discapacidad, VIH…), avanceObra (estado de una obra habitacional).",
  "- datos.socioeconomico: familia (condición familiar), ingresos, vivienda, vulnerabilidades (lista de situaciones de riesgo mencionadas literalmente: violencia, situación de calle, sin documentación, etc.; si no se mencionan, []).",
  "- datos.intervencion: fecha exacta, lugar (clave en operativos móviles), tipoActividad (taller, consulta médica, asesoría legal, entrega…), profesionales (lista de profesionales o voluntarios presentes).",
  "- datos.seguimiento: situacionLaboral, desempenoAcademico. No uses este campo para acciones pendientes — esas van en accionesPendientes.",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (reacción emocional, percepción de una madre sobre su vivienda…). Si no hay, \"\".",
  "Regla crítica para listas: si un campo de tipo array no se menciona explícitamente en la transcripción, devolvé [] sin excepción. Nunca uses los nombres de campos como ejemplos de valores. \"compromisos\", \"vulnerabilidades\", \"profesionales\" son etiquetas, no datos.",
  "Responde en español. /no_think",
];

const buildSystemPrompt = (enfasis = []) =>
  [...REGLAS_ABSOLUTAS, ...enfasis, ...ESTRUCTURA_CAMPOS].join("\n");

const PROMPTS = {
  generic: buildSystemPrompt(),
  "primera-infancia": buildSystemPrompt([
    "CONTEXTO DEL PROGRAMA — Primera Infancia (0 a 5 años): el beneficiario es el niño o niña; el interlocutor en el audio es la familia (madre, padre o cuidador). esMenor es siempre true.",
    "Presta especial atención y prioriza extraer, si se mencionan: peso, talla, percentiles de crecimiento, hitos de desarrollo psicomotor, diagnósticos nutricionales (desnutrición, bajo peso, anemia…), entrega de bolsón de alimentos, fecha de la próxima consulta pediátrica y observaciones sobre el vínculo madre-hijo/a.",
  ]),
  "ninez-adolescencia": buildSystemPrompt([
    "CONTEXTO DEL PROGRAMA — Niñez y Adolescencia (6 a 18 años): el beneficiario es un niño, niña o adolescente. esMenor es true salvo que se diga lo contrario.",
    "Presta especial atención y prioriza extraer, si se mencionan: desempeño escolar (en datos.seguimiento.desempenoAcademico), asistencia a la escuela, actividades en las que participa (fútbol, talleres, apoyo escolar), situación familiar, riesgo de deserción escolar, conductas de riesgo y vínculos con pares.",
  ]),
  oficios: buildSystemPrompt([
    "CONTEXTO DEL PROGRAMA — Oficios: el beneficiario es una persona ADULTA en capacitación laboral. esMenor es SIEMPRE false; nunca lo marques true.",
    "Presta especial atención y prioriza extraer, si se mencionan: el oficio que está aprendiendo, asistencia al taller de capacitación, situación laboral actual (en datos.seguimiento.situacionLaboral), ingresos (en datos.socioeconomico.ingresos), compromisos de pago si hay un microcrédito (en datos.seguimiento.compromisos) y el progreso en la capacitación.",
  ]),
};

// --- Verbatim desde schema.ts (EXTRACTION_JSON_SCHEMA) ---------------------
const strArray = { type: "array", items: { type: "string" } };
const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    prioridad: { type: "string", enum: ["ALTA", "MEDIA", "BAJA"] },
    entidades: {
      type: "object",
      properties: { nombres: strArray, fechas: strArray },
      required: ["nombres", "fechas"],
      additionalProperties: false,
    },
    accionesPendientes: strArray,
    datos: {
      type: "object",
      properties: {
        demografia: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            esMenor: { type: "boolean" },
          },
          required: ["nombre", "edad", "fechaNacimiento", "esMenor"],
          additionalProperties: false,
        },
        metricas: {
          type: "object",
          properties: {
            peso: { type: "string" },
            talla: { type: "string" },
            diagnosticos: strArray,
            avanceObra: { type: "string" },
          },
          required: ["peso", "talla", "diagnosticos", "avanceObra"],
          additionalProperties: false,
        },
        socioeconomico: {
          type: "object",
          properties: {
            familia: { type: "string" },
            ingresos: { type: "string" },
            vivienda: { type: "string" },
            vulnerabilidades: strArray,
          },
          required: ["familia", "ingresos", "vivienda", "vulnerabilidades"],
          additionalProperties: false,
        },
        intervencion: {
          type: "object",
          properties: {
            fecha: { type: "string" },
            lugar: { type: "string" },
            tipoActividad: { type: "string" },
            profesionales: strArray,
          },
          required: ["fecha", "lugar", "tipoActividad", "profesionales"],
          additionalProperties: false,
        },
        seguimiento: {
          type: "object",
          properties: {
            compromisos: strArray,
            situacionLaboral: { type: "string" },
            desempenoAcademico: { type: "string" },
          },
          required: ["compromisos", "situacionLaboral", "desempenoAcademico"],
          additionalProperties: false,
        },
        narrativa: { type: "string" },
      },
      required: [
        "demografia",
        "metricas",
        "socioeconomico",
        "intervencion",
        "seguimiento",
        "narrativa",
      ],
      additionalProperties: false,
    },
  },
  required: ["resumen", "prioridad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};

// --- jsCode de los nodos Code ---------------------------------------------
const initCode = `// Normaliza el payload del webhook ({id, audioPath, metadata}).
const b = $json.body ?? $json;
if (!b || !b.id) {
  throw new Error('payload del webhook sin id');
}
return [{ json: { id: b.id, audioPath: b.audioPath, metadata: b.metadata || {} } }];`;

const prepCode = `// Arma el cuerpo de la llamada a Ollama (chat) con grammar-constrained JSON.
// SYSTEM_PROMPT y EXTRACTION_JSON_SCHEMA: mantener en sync con assemble.ts/schema.ts.
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fechaLarga(ms){ const d = new Date(ms); return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }

const PROMPTS = ${JSON.stringify(PROMPTS)};
const EXTRACTION_JSON_SCHEMA = ${JSON.stringify(EXTRACTION_JSON_SCHEMA)};

const transcript = (($json.text) || '').trim();
const meta = $('init').item.json.metadata || {};
// Selecciona el system prompt según el programa; genérico si null/desconocido.
const SYSTEM_PROMPT = PROMPTS[meta.programa] || PROMPTS.generic;
const capturedAt = typeof meta.capturedAt === 'number' ? meta.capturedAt : Date.now();
const userMessage = 'Fecha del registro: ' + fechaLarga(capturedAt) + '.\\n\\nTranscripción:\\n' + transcript;
const model = $env.OLLAMA_MODEL || 'qwen3:1.7b';

const ollamaBody = {
  model,
  stream: false,
  format: EXTRACTION_JSON_SCHEMA,
  // qwen3 es un modelo de RAZONAMIENTO: sin esto genera miles de tokens de
  // "thinking" antes de responder (n_decoded 2000+), el pipeline tarda minutos
  // y la UI queda colgada en "procesando". think:false lo desactiva de raíz.
  think: false,
  options: {
    temperature: 0,
    num_predict: 1024, // tope de seguridad anti-runaway (el JSON real ~300-500 tokens).
  },
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ],
};
return [{ json: { ollamaBody, transcript } }];`;

const parseCode = `// Parsea el JSON garantizado que devuelve Ollama (message.content).
const content = ($json.message && $json.message.content) || '';
let extraction;
try {
  extraction = JSON.parse(content);
} catch (e) {
  throw new Error('Ollama no devolvió JSON válido: ' + e.message);
}
return [{ json: { extraction, transcript: $('preparar-prompt').item.json.transcript } }];`;

// --- Helpers de nodos ------------------------------------------------------
function httpJsonBody(expr) {
  return {
    method: "POST",
    sendBody: true,
    specifyBody: "json",
    jsonBody: expr,
    options: { timeout: 600000 },
  };
}

const APP = "={{ $env.APP_URL || 'http://app-pwa:3000' }}";
const idExpr = "{{ $('init').item.json.id }}";

const nodes = [
  {
    parameters: {
      httpMethod: "POST",
      path: "registro",
      // Responder AL INSTANTE: el webhook es fire-and-forget. La PWA no espera
      // el resultado acá — lo consulta por polling a /api/informe/[id]. Con
      // "responseNode" n8n mantenía la conexión abierta todo el pipeline
      // (whisper+ollama = minutos en CPU) → HeadersTimeoutError en la PWA.
      responseMode: "onReceived",
      options: {},
    },
    id: "node-webhook",
    name: "webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [-160, 300],
    webhookId: "pp-registro",
  },
  {
    parameters: { jsCode: initCode },
    id: "node-init",
    name: "init",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [60, 300],
  },
  {
    parameters: {
      method: "POST",
      url: "={{ $env.WHISPER_URL || 'http://whisper:8000' }}/transcribe",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ { \"path\": $('init').item.json.audioPath } }}",
      options: { timeout: 600000 },
    },
    id: "node-whisper",
    name: "whisper",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [280, 300],
    onError: "continueErrorOutput",
  },
  {
    parameters: { jsCode: prepCode },
    id: "node-prep",
    name: "preparar-prompt",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [500, 300],
  },
  {
    parameters: {
      method: "POST",
      url: "={{ $env.OLLAMA_URL || 'http://ollama:11434' }}/api/chat",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ $json.ollamaBody }}",
      options: { timeout: 600000 },
    },
    id: "node-ollama",
    name: "ollama",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [720, 300],
    onError: "continueErrorOutput",
  },
  {
    parameters: { jsCode: parseCode },
    id: "node-parse",
    name: "parse",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [940, 300],
    onError: "continueErrorOutput",
  },
  {
    parameters: {
      method: "POST",
      url: `${APP}/api/informe/${idExpr}/extraccion`,
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        '={{ { "transcript": $json.transcript, "extraction": $json.extraction } }}',
      options: { timeout: 60000 },
    },
    id: "node-extraccion",
    name: "extraccion",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1160, 300],
    onError: "continueErrorOutput",
  },
  {
    parameters: {
      method: "POST",
      url: `${APP}/api/informe/${idExpr}/generar-docx`,
      sendBody: false,
      options: { timeout: 60000 },
    },
    id: "node-docx",
    name: "generar-docx",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1380, 300],
    onError: "continueErrorOutput",
  },
  {
    parameters: {
      method: "POST",
      url: `${APP}/api/informe/${idExpr}/error`,
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        "={{ { \"error\": ($json.error && ($json.error.message || $json.error.description)) || 'fallo en la orquestación' } }}",
      options: { timeout: 60000 },
    },
    id: "node-marcar-error",
    name: "marcar-error",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [720, 560],
    onError: "continueRegularOutput",
  },
  // --- Ganchos futuros (desconectados, NoOp) -------------------------------
  {
    parameters: {},
    id: "node-hook-r2",
    name: "R2 upload (futuro)",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1380, 120],
  },
  {
    parameters: {},
    id: "node-hook-wa",
    name: "WhatsApp (futuro)",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1600, 120],
  },
  {
    parameters: {},
    id: "node-hook-analisis",
    name: "Análisis de patrones (futuro)",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [60, 560],
  },
];

// --- Conexiones ------------------------------------------------------------
// HTTP con onError=continueErrorOutput exponen 2 salidas main: [normal, error].
const connections = {
  webhook: { main: [[{ node: "init", type: "main", index: 0 }]] },
  init: { main: [[{ node: "whisper", type: "main", index: 0 }]] },
  whisper: {
    main: [
      [{ node: "preparar-prompt", type: "main", index: 0 }],
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  "preparar-prompt": { main: [[{ node: "ollama", type: "main", index: 0 }]] },
  ollama: {
    main: [
      [{ node: "parse", type: "main", index: 0 }],
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  parse: {
    main: [
      [{ node: "extraccion", type: "main", index: 0 }],
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  extraccion: {
    main: [
      [{ node: "generar-docx", type: "main", index: 0 }],
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  "generar-docx": {
    main: [
      [], // éxito = fin del pipeline (la PWA ya tiene el .docx vía polling)
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  // marcar-error es terminal: registra el error en SQLite y termina.
};

const workflow = {
  name: "Pequeños Pasos — registro",
  nodes,
  connections,
  active: false,
  settings: {
    executionOrder: "v1",
    // Guardar ejecuciones para poder debuggear en la pestaña Executions de n8n.
    saveDataSuccessExecution: "all",
    saveDataErrorExecution: "all",
    saveManualExecutions: true,
  },
  tags: [],
};

// ── Escribir archivo ────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Escrito:", OUT);

// ── Upsert en n8n vía API REST ───────────────────────────────────────────────
// Lee N8N_API_KEY del entorno (o de .env si existe). Si no hay key, termina sin error.
// Para obtener la key: n8n UI → Settings → API → Create an API key.
// Agregar al .env:  N8N_API_KEY=tu-key-aqui
// Uso manual:       N8N_API_KEY=xxx node scripts/gen-n8n-workflow.mjs
async function upsertInN8n() {
  // Carga .env si existe (sin dependencias externas)
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }

  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    console.log("N8N_API_KEY no definida — saltando upsert. Importá el archivo manualmente o agregá la key al .env.");
    return;
  }

  const base = (process.env.N8N_EDITOR_URL || "http://localhost:5678").replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", "X-N8N-API-KEY": apiKey };

  // Buscar si ya existe el workflow por nombre
  const listRes = await fetch(`${base}/api/v1/workflows?limit=100`, { headers });
  if (!listRes.ok) {
    console.error("n8n API error al listar workflows:", listRes.status, await listRes.text());
    return;
  }
  const { data } = await listRes.json();
  const existing = data?.find((w) => w.name === workflow.name);

  let res;
  if (existing) {
    // PUT actualiza nodos y conexiones; active es read-only en la API (se maneja aparte).
    const { active: _active, tags: _tags, ...workflowBody } = workflow;
    void _tags;
    void _active;
    res = await fetch(`${base}/api/v1/workflows/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(workflowBody),
    });
    console.log(res.ok ? `Workflow actualizado en n8n (id: ${existing.id})` : `Error al actualizar: ${res.status} ${await res.text()}`);
  } else {
    res = await fetch(`${base}/api/v1/workflows`, {
      method: "POST",
      headers,
      body: JSON.stringify(workflow),
    });
    if (res.ok) {
      const created = await res.json();
      console.log(`Workflow creado en n8n (id: ${created.id})`);
    } else {
      console.error(`Error al crear: ${res.status} ${await res.text()}`);
    }
  }
}

upsertInN8n().catch((e) => console.error("upsertInN8n falló:", e.message));
