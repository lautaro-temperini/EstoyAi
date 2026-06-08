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

// --- Verbatim desde assemble.ts -------------------------------------------
const SYSTEM_PROMPT = [
  "Convierte la transcripción de un mensaje de voz en un informe de campo estructurado para una ONG.",
  'Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja "" (texto) o [] (lista). No uses vocabulario que no esté en el texto.',
  'Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. "Mensaje de prueba sin información operativa") y deja el resto vacío.',
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: ALTA solo si se menciona explícitamente una emergencia médica o de seguridad; MEDIA si se menciona un seguimiento necesario; en cualquier otro caso BAJA.",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  '- entidades.fechas: fechas mencionadas; convierte las relativas ("hoy", "el martes") a fecha absoluta usando la "Fecha del registro"; si no hay, [].',
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (columna vertebral del registro; deja vacío lo no mencionado):",
  "- datos.demografia: nombre, edad, fechaNacimiento del beneficiario; esMenor=true SOLO si se indica o se deduce que es menor de edad.",
  "- datos.metricas: peso y talla (antropométricos para nutrición), diagnosticos (lista de diagnósticos médicos específicos: oncología, discapacidad, VIH…), avanceObra (estado de una obra habitacional).",
  "- datos.socioeconomico: familia (condición familiar), ingresos, vivienda, vulnerabilidades (lista).",
  "- datos.intervencion: fecha exacta, lugar (clave en operativos móviles), tipoActividad (taller, consulta médica, asesoría legal, entrega…), profesionales (lista de profesionales o voluntarios presentes).",
  "- datos.seguimiento: compromisos (lista de compromisos concretos mencionados literalmente en el audio, por ejemplo pagos pendientes o acuerdos explícitos; si no se mencionan, []), situacionLaboral, desempenoAcademico.",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (reacción emocional, percepción de una madre sobre su vivienda…). Si no hay, \"\".",
  "Regla crítica para listas: si un campo de tipo array no se menciona explícitamente en la transcripción, devolvé [] sin excepción. Nunca uses los nombres de campos como ejemplos de valores. \"compromisos\", \"vulnerabilidades\", \"profesionales\" son etiquetas, no datos.",
  "Responde en español. /no_think",
].join("\n");

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

const SYSTEM_PROMPT = ${JSON.stringify(SYSTEM_PROMPT)};
const EXTRACTION_JSON_SCHEMA = ${JSON.stringify(EXTRACTION_JSON_SCHEMA)};

const transcript = (($json.text) || '').trim();
const meta = $('init').item.json.metadata || {};
const capturedAt = typeof meta.capturedAt === 'number' ? meta.capturedAt : Date.now();
const userMessage = 'Fecha del registro: ' + fechaLarga(capturedAt) + '.\\n\\nTranscripción:\\n' + transcript;
const model = $env.OLLAMA_MODEL || 'qwen3:1.7b';

const ollamaBody = {
  model,
  stream: false,
  format: EXTRACTION_JSON_SCHEMA,
  options: { temperature: 0 },
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
      responseMode: "responseNode",
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
      respondWith: "json",
      responseBody:
        '={{ { "id": $(\'init\').item.json.id, "estado": "LISTO" } }}',
      options: {},
    },
    id: "node-respond-ok",
    name: "respond-ok",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.1,
    position: [1600, 300],
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
  {
    parameters: {
      respondWith: "json",
      responseCode: 500,
      responseBody:
        '={{ { "id": $(\'init\').item.json.id, "estado": "ERROR" } }}',
      options: {},
    },
    id: "node-respond-error",
    name: "respond-error",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.1,
    position: [940, 560],
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
      [{ node: "respond-ok", type: "main", index: 0 }],
      [{ node: "marcar-error", type: "main", index: 0 }],
    ],
  },
  "marcar-error": {
    main: [[{ node: "respond-error", type: "main", index: 0 }]],
  },
};

const workflow = {
  name: "Pequeños Pasos — registro",
  nodes,
  connections,
  active: false,
  settings: { executionOrder: "v1" },
  tags: [],
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Escrito:", OUT);
