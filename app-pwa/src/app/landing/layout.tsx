import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./landing.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EstoyAi — Registro de campo por voz para ONGs",
  description:
    "El promotor dicta dos minutos; tu sede genera un informe .docx estructurado. Funciona sin internet en campo, corre en hardware modesto y los datos de beneficiarios nunca salen de la organización.",
  keywords: [
    "registro de campo por voz",
    "software para ONG",
    "informes de visitas domiciliarias",
    "open source ONG",
    "IA local",
    "sin conexión",
  ],
  openGraph: {
    title: "EstoyAi — Registro de campo por voz para ONGs",
    description:
      "Convertí lo que el promotor dicta en un informe estructurado. Gratis, open source, offline y con los datos en tu sede.",
    type: "website",
    locale: "es_AR",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
      <div className={`landing ${inter.variable}`}>
        {children}
      </div>
    </>
  );
}
