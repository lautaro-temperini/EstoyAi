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
  title: "EstoyAi — Informes de visitas domiciliarias por voz",
  description:
    "Dictá la visita en dos minutos. Tu sede genera el informe Word — offline, uniforme, sin mandar la voz de las familias a la nube.",
  openGraph: {
    title: "EstoyAi — Informes de visitas domiciliarias por voz",
    description:
      "Recuperá tiempo de acompañamiento sin exportar la intimidad de las familias a infraestructura ajena.",
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
