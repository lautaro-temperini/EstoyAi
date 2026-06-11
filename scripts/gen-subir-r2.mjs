/**
 * Genera n8n/workflows/subir-r2.json: webhook → Code node que sube el .docx a
 * Cloudflare R2 firmando SigV4 a mano, leyendo TODO de $env (sin credencial n8n).
 *
 * Envs que usa (todas en .env de la sede):
 *   CF_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, CF_R2_BUCKET
 *   APP_URL (interno, default http://app-pwa:3000)
 *
 * Requiere en docker-compose (servicio n8n):
 *   NODE_FUNCTION_ALLOW_BUILTIN=crypto,http,https
 *   (crypto para la firma; http/https para transferir los bytes EXACTOS —
 *    helpers.httpRequest/axios altera el cuerpo binario y rompe la firma)
 *
 * Regenerar:  node scripts/gen-subir-r2.mjs
 * Reimportar: n8n → Workflows → Import from file → n8n/workflows/subir-r2.json
 */
import { writeFileSync } from "node:fs";

// El Code node usa NL = String.fromCharCode(10) en vez de '\n' para evitar
// cualquier problema de escapado al serializar a JSON.
const jsCode = `
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const NL = String.fromCharCode(10);
const body = $('webhook-r2').item.json.body || {};
if (!body.id) throw new Error('payload sin id');

const appUrl = $env.APP_URL || 'http://app-pwa:3000';
const accountId = $env.CF_ACCOUNT_ID;
const accessKey = $env.CF_R2_ACCESS_KEY_ID;
const secretKey = $env.CF_R2_SECRET_ACCESS_KEY;
const bucket = $env.CF_R2_BUCKET;
if (!accountId || !accessKey || !secretKey || !bucket) {
  throw new Error('Faltan envs R2: CF_ACCOUNT_ID / CF_R2_ACCESS_KEY_ID / CF_R2_SECRET_ACCESS_KEY / CF_R2_BUCKET');
}

// http/https crudos: helpers.httpRequest (axios) altera el cuerpo binario y
// rompe la firma SigV4 (hash del payload != cuerpo enviado -> R2 400).
const request = (mod, options, payload) => new Promise((resolve, reject) => {
  const req = mod.request(options, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

// 1) Descargar el .docx desde app-pwa (n8n no monta el volumen data).
// (sin new URL: el sandbox del Code node no expone esa global)
const m = appUrl.match(/^https?:[/][/]([^:/]+)(?::(\\d+))?/);
if (!m) throw new Error('APP_URL invalida: ' + appUrl);
const got = await request(http, { hostname: m[1], port: m[2] ? Number(m[2]) : 80, path: '/api/informe/' + body.id + '/docx', method: 'GET' });
if (got.status !== 200) throw new Error('descarga del docx fallo: HTTP ' + got.status);
const payload = got.body;

// 2) Firma SigV4 (servicio s3, region auto, path-style).
const host = accountId + '.r2.cloudflarestorage.com';
const region = 'auto';
const service = 's3';
const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const key = [body.carpeta, body.subcarpeta, body.filename].filter(Boolean).join('/');
const canonicalUri = '/' + bucket + '/' + key.split('/').map(enc).join('/');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const amzDate = '' + now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
const dateStamp = amzDate.slice(0, 8);

const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
const canonicalHeaders = ['content-type:' + contentType, 'host:' + host, 'x-amz-content-sha256:' + payloadHash, 'x-amz-date:' + amzDate].join(NL) + NL;
const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join(NL);

const scope = dateStamp + '/' + region + '/' + service + '/aws4_request';
const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join(NL);

const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const kDate = hmac('AWS4' + secretKey, dateStamp);
const kRegion = hmac(kDate, region);
const kService = hmac(kRegion, service);
const kSigning = hmac(kService, 'aws4_request');
const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

const authorization = 'AWS4-HMAC-SHA256 Credential=' + accessKey + '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;

// 3) PUT del objeto a R2 (bytes exactos: content-length explicito, sin chunked).
const res = await request(https, {
  hostname: host,
  path: canonicalUri,
  method: 'PUT',
  headers: {
    Authorization: authorization,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'content-type': contentType,
    'content-length': payload.length,
  },
}, payload);
if (res.status !== 200) {
  throw new Error('R2 respondio ' + res.status + ': ' + res.body.toString('utf8').slice(0, 300));
}

return [{ json: { ok: true, key, status: res.status, bytes: payload.length } }];
`.trim();

const workflow = {
  // id estable: import:workflow actualiza en vez de duplicar (igual que registro).
  id: "estoyaisubirr2",
  name: "subir-r2",
  nodes: [
    {
      parameters: { httpMethod: "POST", path: "subir-r2", responseMode: "lastNode", options: {} },
      id: "node-webhook-r2",
      name: "webhook-r2",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-160, 300],
      webhookId: "pp-subir-r2",
    },
    {
      parameters: { jsCode },
      id: "node-subir",
      name: "subir-r2",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [80, 300],
    },
  ],
  connections: {
    "webhook-r2": { main: [[{ node: "subir-r2", type: "main", index: 0 }]] },
  },
  active: false,
  settings: { executionOrder: "v1" },
};

const out = new URL("../n8n/workflows/subir-r2.json", import.meta.url);
writeFileSync(out, JSON.stringify(workflow, null, 2) + "\n");
console.log("Escrito:", out.pathname);
