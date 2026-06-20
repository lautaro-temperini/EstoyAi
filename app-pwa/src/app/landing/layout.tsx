import type { Metadata } from "next";
import { ROOT_DOMAIN } from "@/lib/tenants/config";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
  title: "EstoyAi — Registro de campo por voz para ONGs",
  description:
    "El promotor dicta dos minutos; tu sede genera un informe .docx estructurado. Funciona sin internet en campo, corre en hardware estándar y los datos de beneficiarios nunca salen de la organización.",
  keywords: [
    "registro de campo por voz",
    "software para ONG",
    "informes de visitas domiciliarias",
    "open source ONG",
    "IA local",
    "sin conexión",
  ],
  alternates: { canonical: "/" },
  // La landing es la página pública indexable (gana sobre el noindex del root).
  robots: { index: true, follow: true },
  openGraph: {
    title: "EstoyAi — Registro de campo por voz para ONGs",
    description:
      "Convertí lo que el promotor dicta en un informe estructurado. Gratis, open source, offline y con los datos en tu sede.",
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "EstoyAi",
  },
  twitter: {
    card: "summary_large_image",
    title: "EstoyAi — Registro de campo por voz para ONGs",
    description:
      "Convertí lo que el promotor dicta en un informe estructurado. Gratis, open source, offline y con los datos en tu sede.",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fuentes e iconos self-hosted vía globals.css (@import fonts.css). Sin googleapis.
  return <div className="landing">{children}</div>;
}
