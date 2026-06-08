// Vercel -> Railway proxy for `qvac serve openai`.
//
// IMPORTANT: do NOT import @qvac/sdk or @repo/qvacs here. They pull a native
// `bare` binary that crashes on Vercel. This route only does plain HTTP forwarding
// to an external OpenAI-compatible QVAC server (Railway), so it stays serverless-safe.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Headers we must not forward upstream (hop-by-hop + host-specific).
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

// Headers we must not copy back from upstream onto the Next.js response.
const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

type RouteContext = { params: Promise<{ path: string[] }> };

// Ordered upstreams: Railway first, then an optional ngrok-exposed local server
// as the last fallback (operator's fast GPU box published via `bun run
// qvac:ngrok`). Same QVAC_API_KEY is sent to all.
function upstreamBases(): string[] {
  return [process.env.QVAC_BASE_URL, process.env.QVAC_NGROK_URL]
    .filter((b): b is string => !!b && b.trim().length > 0)
    .map((b) => b.replace(/\/+$/, ""));
}

function buildTargetUrl(base: string, req: Request, path: string[]): string {
  const suffix = path.map((p) => encodeURIComponent(p)).join("/");
  const query = new URL(req.url).search; // includes leading "?" or ""
  return `${base}/${suffix}${query}`;
}

function buildForwardHeaders(req: Request): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const apiKey = process.env.QVAC_API_KEY;
  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }
  // Bypass the ngrok-free interstitial when the QVAC_NGROK_URL upstream is an
  // ngrok tunnel (harmless for the Railway upstream).
  headers.set("ngrok-skip-browser-warning", "true");

  return headers;
}

function buildResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxy(req: Request, ctx: RouteContext): Promise<Response> {
  const { path } = await ctx.params;
  const bases = upstreamBases();

  if (bases.length === 0) {
    return NextResponse.json(
      { error: "QVAC_BASE_URL not configured" },
      { status: 503 }
    );
  }

  // Read the raw body once so multipart audio (and any binary payload) passes
  // through untouched; an ArrayBuffer is reusable across upstream attempts.
  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) body = buf;
  }
  const headers = buildForwardHeaders(req);

  let lastError = "no upstream reachable";
  for (let i = 0; i < bases.length; i++) {
    const isLast = i === bases.length - 1;
    const target = buildTargetUrl(bases[i], req, path ?? []);
    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
      });
      // Fall through to the next upstream on a server error (e.g. Railway
      // crashed/cold), but return client errors and successes as-is.
      if (upstream.status >= 500 && !isLast) {
        lastError = `upstream ${i} returned ${upstream.status}`;
        continue;
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: buildResponseHeaders(upstream),
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isLast) break;
    }
  }

  return NextResponse.json(
    { error: "All QVAC upstreams failed", detail: lastError },
    { status: 502 }
  );
}

export function GET(req: Request, ctx: RouteContext): Promise<Response> {
  return proxy(req, ctx);
}

export function POST(req: Request, ctx: RouteContext): Promise<Response> {
  return proxy(req, ctx);
}

export function OPTIONS(req: Request, ctx: RouteContext): Promise<Response> {
  return proxy(req, ctx);
}
