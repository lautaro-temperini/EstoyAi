import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { QueueFlusher } from "./queue-flusher";
import { FlowProvider } from "./flow-context";
import { MainNav } from "@/components/main-nav";
import { tenantFromHeaders, isLandingHost, ROOT_DOMAIN } from "@/lib/tenants/config";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenant = tenantFromHeaders(h);
  const landing = isLandingHost(h.get("host"));
  return {
    metadataBase: new URL(`https://${ROOT_DOMAIN}`),
    title: `${tenant.orgName} — Registro de campo`,
    description: `Registro de campo por voz para promotores de ${tenant.orgName}.`,
    manifest: "/manifest.webmanifest",
    // La app operativa es privada: no indexar los subdominios de ONG. La landing
    // del apex SÍ se indexa (su metadata propia, en landing/layout.tsx, gana).
    robots: landing ? undefined : { index: false, follow: false },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: tenant.shortName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f8f9ff",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale/userScalable: bloquear el zoom viola WCAG 1.4.4 (los
  // promotores deben poder agrandar el texto).
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      {/* Fuentes e iconos self-hosted vía @import en globals.css (sin googleapis). */}
      <body
        suppressHydrationWarning
        className="min-h-full bg-surface text-on-surface font-body-md antialiased"
      >
        <FlowProvider>
          {children}
        </FlowProvider>
        <MainNav />
        <ServiceWorkerRegister />
        <QueueFlusher />
      </body>
    </html>
  );
}
