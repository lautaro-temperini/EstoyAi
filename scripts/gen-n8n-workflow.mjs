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

// ── Parametrización: workflow global (todas las ONGs) o por tenant ───────────
// El flujo (topología) es uno solo y adaptativo. Lo que cambia por ONG es el
// CONTENIDO inyectado: prompts (por programa) y schema (por tenant).
//
//   node scripts/gen-n8n-workflow.mjs
//     → workflow GLOBAL multi-tenant: lleva los prompts/schemas de todas las
//       ONGs y elige por meta.tenant. Es el que usa la instalación compartida.
//
//   node scripts/gen-n8n-workflow.mjs --tenant dtcvillatranquila [--out ruta.json]
//     → workflow SINGLE-TENANT: emite SOLO el prompt/schema de esa ONG (para
//       compilar un instalador por sede). El tenant queda fijo de hecho.
const argv = process.argv.slice(2);
const argValue = (flag) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const TARGET_TENANT = argValue("--tenant");

// Metadatos por tenant para el modo single-tenant (programas que ofrece + clave
// de schema en SCHEMAS). Mantener en sync con lib/reports/verticals y config.ts.
const TENANT_META = {
  pequenospasos: {
    orgName: "Pequeños Pasos",
    programas: ["primera-infancia", "ninez-adolescencia", "oficios"],
    schemaKey: "default",
  },
  dtcvillatranquila: {
    orgName: "DTC Villa Tranquila",
    programas: ["hpc", "seguimiento", "taller"],
    schemaKey: "dtcvillatranquila",
  },
};
if (TARGET_TENANT && !TENANT_META[TARGET_TENANT]) {
  console.error(
    `Tenant desconocido: "${TARGET_TENANT}". Conocidos: ${Object.keys(TENANT_META).join(", ")}`,
  );
  process.exit(1);
}

const OUT =
  argValue("--out") || path.join(__dirname, "..", "n8n", "workflows", "registro.json");

// SYNC: este prompt debe mantenerse idéntico en scripts/gen-n8n-workflow.mjs y assemble.ts
const REGLAS_ABSOLUTAS = [
  "Convierte la transcripción de un mensaje de voz en un informe de campo estructurado para una ONG.",
  "Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja \"\" (texto) o [] (lista). No uses vocabulario que no esté en el texto.",
  "Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. \"Mensaje de prueba sin información operativa\") y deja el resto vacío.",
];

const ESTRUCTURA_CAMPOS = [
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: clasificá en este orden de precedencia (revisá de ALTA a BAJA y aplicá el primer nivel que corresponda):",
  "  ALTA — acción el mismo día: violencia física, abuso sexual o psicológico, violencia intrafamiliar aguda, daños físicos o psicológicos evidentes en niños/as o adolescentes, riesgo de vida inminente.",
  "  MEDIA — acción en 24-72hs: falta de insumos del comedor o de primera necesidad (pañales, leche fórmula, botiquín); desnutrición leve o moderada; falta de controles médicos obligatorios; ausencias frecuentes sin justificación (2+ veces por semana); rotura de equipamiento clave que frena la actividad (heladera, bomba de agua, internet); conflictos o discusiones fuertes entre beneficiarios.",
  "  MEDIA también si hay compromisos de microcrédito con pagos atrasados o en riesgo de incumplimiento. NO aplicar MEDIA si el beneficiario está al día con los pagos.",
  "  MEDIA también si hay una acción de seguimiento explícita pendiente (visita programada, renovación, derivación no urgente) que no encaje en ningún ítem de ALTA ni de BAJA.",
  "  BAJA — resolución semanal/mensual: falta de materiales no esenciales (témperas, hojas, juegos); reparaciones menores (foco, puerta, humedad estética); demoras en legajos que no impiden el seguimiento; baja de voluntario reemplazable. Si la transcripción es puramente informativa: BAJA.",
  "- motivoCriticidad: una frase corta (máx 15 palabras) explicando por qué se asignó esa prioridad. Si es BAJA informativa, devolvé \"\".",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  "- entidades.fechas: fechas mencionadas; convierte las relativas (\"hoy\", \"el martes\") a fecha absoluta usando la \"Fecha del registro\"; si no hay, [].",
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (columna vertebral del registro; deja vacío lo no mencionado):",
  "- datos.demografia: edad, fechaNacimiento del beneficiario; esMenor=true SOLO si se indica o se deduce que es menor de edad. NO extraigas el nombre del beneficiario: ya viene cargado en los campos fijos del registro.",
  "- datos.metricas: peso y talla (antropométricos para nutrición), diagnosticos (lista de diagnósticos médicos específicos: oncología, discapacidad, VIH…), avanceObra (estado de una obra habitacional).",
  "- datos.socioeconomico: familia (condición familiar), ingresos, vivienda, vulnerabilidades (lista de situaciones de riesgo mencionadas literalmente: violencia, situación de calle, sin documentación, etc.; si no se mencionan, []).",
  "- datos.intervencion: fecha exacta, lugar (clave en operativos móviles), tipoActividad (taller, consulta médica, asesoría legal, entrega…).",
  "- datos.seguimiento: situacionLaboral, desempenoAcademico. No uses este campo para acciones pendientes — esas van en accionesPendientes.",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (reacción emocional, percepción de una madre sobre su vivienda…). Si no hay, \"\".",
  "Regla crítica para listas: si un campo de tipo array no se menciona explícitamente en la transcripción, devolvé [] sin excepción. Nunca uses los nombres de campos como ejemplos de valores. \"compromisos\", \"vulnerabilidades\", \"diagnosticos\" son etiquetas, no datos.",
  "Responde en español. /no_think",
];

const buildSystemPrompt = (enfasis = []) =>
  [...REGLAS_ABSOLUTAS, ...enfasis, ...ESTRUCTURA_CAMPOS].join("\n");

// --- Vertical DTC (SEDRONAR) ------------------------------------------------
// SYNC: estructura de datos espeja lib/reports/verticals/dtc.ts (DtcDatos /
// DTC_EXTRACTION_SCHEMA). Estos prompts viven SOLO acá (el runtime de la
// extracción es n8n; la app no usa system prompts DTC).
const REGLAS_ABSOLUTAS_DTC = [
  "Convierte la transcripción de un mensaje de voz en un registro estructurado para un Dispositivo Territorial Comunitario (DTC, modelo SEDRONAR) de acompañamiento integral de consumos problemáticos. El eje no es la sustancia sino la trayectoria de vida y el acceso a derechos de la persona.",
  "Regla absoluta: extrae EXCLUSIVAMENTE lo que se dice en la transcripción. No inventes datos, sustancias, cifras, nombres, fechas ni diagnósticos. Si un campo no se menciona, deja \"\" (texto) o [] (lista). No uses vocabulario que no esté en el texto.",
  "Si la transcripción es una prueba o no contiene información real, dilo así en el resumen (p. ej. \"Mensaje de prueba sin información operativa\") y deja el resto vacío.",
];

const ESTRUCTURA_CAMPOS_DTC = [
  "Campos de nivel superior:",
  "- resumen: RESUMEN EJECUTIVO de 1-2 frases que reflejen fielmente SOLO lo dicho.",
  "- prioridad: clasificá en este orden de precedencia (de ALTA a BAJA, primer nivel que corresponda):",
  "  ALTA — acción el mismo día: riesgo de vida inminente, intoxicación aguda o sobredosis, ideación o intento de suicidio, violencia o abuso, situación de desprotección de niños/as o adolescentes.",
  "  MEDIA — acción en 24-72hs: consumo problemático activo sin riesgo vital inmediato; vulneración de derechos que requiere gestión (salud, vivienda, documentación, prestaciones); abandono de tratamiento; turno, visita o derivación pendiente.",
  "  BAJA — resolución semanal/mensual o registro informativo: evolución estable, participación en talleres sin alertas, datos de contexto sin urgencia.",
  "- motivoCriticidad: una frase corta (máx 15 palabras) explicando por qué esa prioridad. Si es BAJA informativa, devolvé \"\".",
  "- entidades.nombres: nombres propios de personas dichos literalmente; si no hay, [].",
  "- entidades.fechas: fechas mencionadas; convierte las relativas (\"hoy\", \"el martes\") a fecha absoluta usando la \"Fecha del registro\"; si no hay, [].",
  "- accionesPendientes: tareas de seguimiento dichas literalmente; si no hay, [].",
  "Objeto datos (deja vacío lo no mencionado). NO extraigas el nombre de la persona: ya viene en los campos fijos del registro.",
  "- datos.identificacion: edad, fechaNacimiento, genero.",
  "- datos.consulta: motivo (por qué llega la persona), demanda (qué dice que necesita).",
  "- datos.consumo: sustancias (lista literal de sustancias mencionadas), frecuencia, tiempo (tiempo de consumo), observaciones. Si no se menciona consumo, dejá todo vacío.",
  "- datos.redVincular: familia (situación familiar), vinculos (vínculos significativos), habitacional (situación de vivienda).",
  "- datos.educacionTrabajo: situacionEducativa, situacionLaboral, ingresos.",
  "- datos.salud: fisica (salud física), mental (salud mental, malestar psíquico), tratamientosPrevios.",
  "- datos.vulneracionDerechos: lista de derechos vulnerados mencionados (salud, vivienda, documentación, educación, trabajo…); si no hay, [].",
  "- datos.recursosIntereses: fortalezas, intereses y recursos propios de la persona. Si no hay, \"\".",
  "- datos.talleres: espacios (lista de talleres o actividades comunitarias en las que participa), participacion (cómo es su participación y evolución).",
  "- datos.estrategia: hipotesis (lectura inicial del equipo), hojaDeRuta (plan de abordaje acordado), derivaciones (lista de derivaciones o articulaciones).",
  "- datos.seguimiento: situacionActual, cambios (cambios desde el último encuentro), intervenciones (lista), articulaciones (lista de articulaciones con otros organismos), acuerdos (lista), proximosPasos (lista).",
  "- datos.narrativa: detalles cualitativos sutiles pero valiosos (estado emocional, percepciones, vínculo con el equipo). Si no hay, \"\".",
  "Regla crítica para listas: si un campo de tipo array no se menciona explícitamente, devolvé [] sin excepción. Nunca uses los nombres de campos como ejemplos de valores.",
  "Responde en español. /no_think",
];

const buildDtcPrompt = (enfasis = []) =>
  [...REGLAS_ABSOLUTAS_DTC, ...enfasis, ...ESTRUCTURA_CAMPOS_DTC].join("\n");

// Claves: "<programa>" (todas las ONGs) o "<tenant>:<programa>" (override por
// ONG). La selección en prepCode prueba "<tenant>:<programa>" → "<programa>" →
// "generic". Para un system prompt propio de una ONG, agregá p. ej.
// "otraong:primera-infancia": buildSystemPrompt([...]) y regenerá el workflow.
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
  // DTC (SEDRONAR) — programas hpc / seguimiento / taller.
  hpc: buildDtcPrompt([
    "CONTEXTO — Hoja de Primer Contacto (primera escucha / diagnóstico inicial): el objetivo es construir un diagnóstico integral. Completá especialmente datos.consulta (motivo/demanda), datos.consumo, datos.redVincular, datos.educacionTrabajo, datos.salud, datos.vulneracionDerechos, datos.recursosIntereses y datos.estrategia (hipotesis/hojaDeRuta/derivaciones). Dejá vacío el bloque datos.seguimiento salvo que se mencione.",
  ]),
  seguimiento: buildDtcPrompt([
    "CONTEXTO — Registro de seguimiento (escucha posterior): priorizá el bloque datos.seguimiento (situacionActual, cambios desde el último encuentro, intervenciones, articulaciones, acuerdos, proximosPasos). Completá los demás bloques solo si aparecen datos nuevos.",
  ]),
  taller: buildDtcPrompt([
    "CONTEXTO — Taller / actividad comunitaria: priorizá datos.talleres (espacios y participacion) y datos.seguimiento (articulaciones, proximosPasos). El foco es la participación comunitaria y la construcción de proyecto de vida, no solo la asistencia.",
  ]),
};

// --- Verbatim desde schema.ts (EXTRACTION_JSON_SCHEMA) ---------------------
const strArray = { type: "array", items: { type: "string" } };
const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    prioridad: { type: "string", enum: ["ALTA", "MEDIA", "BAJA"] },
    motivoCriticidad: { type: "string" },
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
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            esMenor: { type: "boolean" },
          },
          required: ["edad", "fechaNacimiento", "esMenor"],
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
          },
          required: ["fecha", "lugar", "tipoActividad"],
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
  required: ["resumen", "prioridad", "motivoCriticidad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};

// --- Schema de la vertical DTC ---------------------------------------------
// SYNC: idéntico a DTC_EXTRACTION_SCHEMA en lib/reports/verticals/dtc.ts.
const DTC_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    prioridad: { type: "string", enum: ["ALTA", "MEDIA", "BAJA"] },
    motivoCriticidad: { type: "string" },
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
        identificacion: {
          type: "object",
          properties: {
            edad: { type: "string" },
            fechaNacimiento: { type: "string" },
            genero: { type: "string" },
          },
          required: ["edad", "fechaNacimiento", "genero"],
          additionalProperties: false,
        },
        consulta: {
          type: "object",
          properties: { motivo: { type: "string" }, demanda: { type: "string" } },
          required: ["motivo", "demanda"],
          additionalProperties: false,
        },
        consumo: {
          type: "object",
          properties: {
            sustancias: strArray,
            frecuencia: { type: "string" },
            tiempo: { type: "string" },
            observaciones: { type: "string" },
          },
          required: ["sustancias", "frecuencia", "tiempo", "observaciones"],
          additionalProperties: false,
        },
        redVincular: {
          type: "object",
          properties: {
            familia: { type: "string" },
            vinculos: { type: "string" },
            habitacional: { type: "string" },
          },
          required: ["familia", "vinculos", "habitacional"],
          additionalProperties: false,
        },
        educacionTrabajo: {
          type: "object",
          properties: {
            situacionEducativa: { type: "string" },
            situacionLaboral: { type: "string" },
            ingresos: { type: "string" },
          },
          required: ["situacionEducativa", "situacionLaboral", "ingresos"],
          additionalProperties: false,
        },
        salud: {
          type: "object",
          properties: {
            fisica: { type: "string" },
            mental: { type: "string" },
            tratamientosPrevios: { type: "string" },
          },
          required: ["fisica", "mental", "tratamientosPrevios"],
          additionalProperties: false,
        },
        vulneracionDerechos: strArray,
        recursosIntereses: { type: "string" },
        talleres: {
          type: "object",
          properties: { espacios: strArray, participacion: { type: "string" } },
          required: ["espacios", "participacion"],
          additionalProperties: false,
        },
        estrategia: {
          type: "object",
          properties: {
            hipotesis: { type: "string" },
            hojaDeRuta: { type: "string" },
            derivaciones: strArray,
          },
          required: ["hipotesis", "hojaDeRuta", "derivaciones"],
          additionalProperties: false,
        },
        seguimiento: {
          type: "object",
          properties: {
            situacionActual: { type: "string" },
            cambios: { type: "string" },
            intervenciones: strArray,
            articulaciones: strArray,
            acuerdos: strArray,
            proximosPasos: strArray,
          },
          required: [
            "situacionActual",
            "cambios",
            "intervenciones",
            "articulaciones",
            "acuerdos",
            "proximosPasos",
          ],
          additionalProperties: false,
        },
        narrativa: { type: "string" },
      },
      required: [
        "identificacion",
        "consulta",
        "consumo",
        "redVincular",
        "educacionTrabajo",
        "salud",
        "vulneracionDerechos",
        "recursosIntereses",
        "talleres",
        "estrategia",
        "seguimiento",
        "narrativa",
      ],
      additionalProperties: false,
    },
  },
  required: ["resumen", "prioridad", "motivoCriticidad", "entidades", "accionesPendientes", "datos"],
  additionalProperties: false,
};

// Schema por tenant. El default (Pequeños Pasos / instalación de un solo
// cliente) es EXTRACTION_JSON_SCHEMA; cada ONG con datos propios se suma acá.
const SCHEMAS = {
  default: EXTRACTION_JSON_SCHEMA,
  dtcvillatranquila: DTC_EXTRACTION_SCHEMA,
};

// ── Selección: qué prompts/schemas embeber + nombre/id del workflow ──────────
let PROMPTS_OUT, SCHEMAS_OUT, WORKFLOW_NAME, WORKFLOW_ID;
if (TARGET_TENANT) {
  const meta = TENANT_META[TARGET_TENANT];
  // Fallback "generic" propio de la ONG: en un build single-tenant no debe
  // quedar el prompt de otra vertical (p. ej. el de Pequeños Pasos en el DTC).
  const GENERIC_BY_TENANT = {
    pequenospasos: PROMPTS.generic,
    dtcvillatranquila: buildDtcPrompt(),
  };
  PROMPTS_OUT = { generic: GENERIC_BY_TENANT[TARGET_TENANT] || PROMPTS.generic };
  for (const p of meta.programas) if (PROMPTS[p]) PROMPTS_OUT[p] = PROMPTS[p];
  // Single-tenant: el schema de la ONG es el default (prepCode usa SCHEMAS[tenant] || default).
  SCHEMAS_OUT = { default: SCHEMAS[meta.schemaKey] };
  WORKFLOW_NAME = `${meta.orgName} — registro`;
  WORKFLOW_ID = `${TARGET_TENANT}registro`;
} else {
  PROMPTS_OUT = PROMPTS;
  SCHEMAS_OUT = SCHEMAS;
  WORKFLOW_NAME = "EstoyAi — registro de voz a informe";
  WORKFLOW_ID = "estoyairegistro";
}

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

const PROMPTS = ${JSON.stringify(PROMPTS_OUT)};
const SCHEMAS = ${JSON.stringify(SCHEMAS_OUT)};

const transcript = (($json.text) || '').trim();
const meta = $('init').item.json.metadata || {};
// Selecciona el system prompt: primero por ONG+programa ("<tenant>:<programa>"),
// luego por programa (compat con instalación de un solo cliente), luego genérico.
const SYSTEM_PROMPT =
  PROMPTS[meta.tenant + ':' + meta.programa] ||
  PROMPTS[meta.programa] ||
  PROMPTS.generic;
// El JSON Schema (grammar) lo decide la vertical del tenant; SCHEMAS.default es el fallback.
const EXTRACTION_JSON_SCHEMA = SCHEMAS[meta.tenant] || SCHEMAS.default;
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

// Header de autenticación de los callbacks internos. La app valida
// X-Internal-Token contra N8N_CALLBACK_SECRET (ver lib/api/internal-auth.ts).
// Si la env no está seteada se manda vacío y la app, también sin secreto, deja
// pasar (dev / pre-migración). En producción ambos lados deben tenerla.
const callbackAuthHeaders = {
  sendHeaders: true,
  specifyHeaders: "keypair",
  headerParameters: {
    parameters: [{ name: "X-Internal-Token", value: "={{ $env.N8N_CALLBACK_SECRET || '' }}" }],
  },
};

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
      ...callbackAuthHeaders,
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
      ...callbackAuthHeaders,
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
      ...callbackAuthHeaders,
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
  id: WORKFLOW_ID,
  name: WORKFLOW_NAME,
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
    // PUT actualiza nodos y conexiones; active/id/tags son read-only en la API.
    const { active: _active, tags: _tags, id: _id, ...workflowBody } = workflow;
    void _tags;
    void _active;
    void _id;
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
