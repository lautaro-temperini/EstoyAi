import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { FlowProvider } from "./flow-context";
import { InferenceModeProvider } from "@/lib/inference/mode";
import { ModeToggle } from "./mode-toggle";

// Dev-only inspector (react-grab). Never loads in production builds.
const enableReactGrab = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: "Smart NGO Voice Reports",
  description:
    "Registro de campo por voz con inferencia local — para operaciones humanitarias.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Voice Reports",
  },
};

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
        {enableReactGrab && (
          <Script
            src="https://unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <InferenceModeProvider>
          <ModeToggle />
          <FlowProvider>{children}</FlowProvider>
        </InferenceModeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
