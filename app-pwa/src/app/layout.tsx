import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { QueueFlusher } from "./queue-flusher";
import { FlowProvider } from "./flow-context";
import { MainNav } from "@/components/main-nav";
import { tenantFromHeaders } from "@/lib/tenants/config";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = tenantFromHeaders(await headers());
  return {
    title: `${tenant.orgName} — Registro de campo`,
    description: `Registro de campo por voz para promotores de ${tenant.orgName}.`,
    manifest: "/manifest.webmanifest",
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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
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
