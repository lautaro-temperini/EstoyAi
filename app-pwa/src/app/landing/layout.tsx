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
  title: "EstoyAi — Informes de campo por voz",
  description:
    "Plataforma para organizaciones sociales: los promotores dictan visitas en el celular y reciben informes Word estructurados, procesados en la propia sede.",
  openGraph: {
    title: "EstoyAi — Informes de campo por voz",
    description:
      "Convertí registros de voz en informes de seguimiento. Offline, uniformes y con los datos en tu sede.",
    type: "website",
    locale: "es_AR",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`landing ${inter.variable}`}>
      {children}
    </div>
  );
}
