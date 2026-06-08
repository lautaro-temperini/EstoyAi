import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pequeños Pasos — Registro de campo",
    short_name: "Pequeños Pasos",
    description: "Registro de campo por voz para promotores.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#f8f9ff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
