import type { NextConfig } from "next";

/**
 * CSP pragmática: todo same-origin (las fuentes/iconos ahora son self-hosted,
 * sin googleapis). 'unsafe-inline' en script/style es necesario para el bootstrap
 * de hidratación de Next y para los estilos inline de la UI; el resto queda
 * cerrado a 'self'. connect-src 'self' alcanza (la app no llama APIs externas
 * desde el browser; n8n/whisper/ollama son server-side en la red Docker).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  // Sin HSTS a propósito: no hay cert SSL en el origen y la sede a veces se
  // accede por http (LAN / IP). HSTS con includeSubDomains forzaría https y
  // rompería ese acceso. El TLS público lo da Cloudflare en su edge.
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
