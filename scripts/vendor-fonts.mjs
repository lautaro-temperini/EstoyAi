/**
 * Descarga las fuentes/iconos de Google a app-pwa/public/fonts y genera un CSS
 * con @font-face apuntando a /fonts/ (sin dependencia de runtime de googleapis:
 * cumple la promesa de offline + soberanía de datos de EstoyAi).
 *
 * Uso: node scripts/vendor-fonts.mjs   (one-off; recorrer si se cambia un peso)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_FONTS = path.join(__dirname, "..", "app-pwa", "public", "fonts");
const OUT_CSS = path.join(__dirname, "..", "app-pwa", "src", "app", "fonts.css");

// UA de Chrome para que Google sirva woff2 (la mejor compresión).
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FAMILIES = [
  {
    slug: "atkinson",
    url: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700;800&display=swap",
  },
  {
    slug: "inter",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  },
  {
    slug: "material-symbols",
    url: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap",
  },
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

fs.mkdirSync(PUBLIC_FONTS, { recursive: true });

let css = "/* Generado por scripts/vendor-fonts.mjs — fuentes self-hosted. No editar a mano. */\n";

for (const fam of FAMILIES) {
  const src = await fetchText(fam.url);
  // Cada bloque @font-face trae una url(...woff2). Descargamos todas y
  // reescribimos a /fonts/<slug>-N.woff2 conservando weight/unicode-range.
  const blocks = src.split("@font-face").slice(1);
  let i = 0;
  for (const block of blocks) {
    const m = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!m) continue;
    const file = `${fam.slug}-${i}.woff2`;
    await download(m[1], path.join(PUBLIC_FONTS, file));
    const rewritten = ("@font-face" + block.split("}")[0] + "}")
      .replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(/fonts/${file})`)
      .trim();
    css += "\n" + rewritten + "\n";
    i++;
  }
  console.log(`${fam.slug}: ${i} archivos`);
}

fs.writeFileSync(OUT_CSS, css + "\n", "utf8");
console.log("CSS escrito:", OUT_CSS);
