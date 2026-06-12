/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático: genera out/ con HTML plano para Cloudflare Pages.
  output: "export",
  // Pages sirve assets tal cual; sin optimizador de imágenes de Next.
  images: { unoptimized: true },
  // La landing vive en app-pwa/src/app/landing; hay que transpilar ese código
  // aunque esté fuera de la raíz de este proyecto.
  transpilePackages: [],
};

export default nextConfig;
