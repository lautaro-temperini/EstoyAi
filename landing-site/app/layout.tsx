import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@landing/landing.css";

/**
 * Root layout del sitio estático del apex (estoyai.com).
 *
 * En app-pwa la landing es un layout ANIDADO (el root provee <html>/<body>).
 * Acá es standalone, así que este root reconstruye <html>/<body> + el wrapper
 * `.landing`, y reusa los metadatos y el contenido desde app-pwa sin duplicar
 * el cuerpo de la página.
 */

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
  display: "swap",
});

export { metadata } from "@landing/layout";

export const dynamic = "force-static";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className={`landing ${inter.variable}`}>{children}</div>
      </body>
    </html>
  );
}
