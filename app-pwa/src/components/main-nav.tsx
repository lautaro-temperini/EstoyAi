"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación principal de las 3 áreas top-level. Mobile: barra inferior (tabs).
 * Desktop: barra superior. Solo se muestra en las rutas top-level — las páginas
 * internas (beneficiario, grabar, estado, informe, preview) tienen su propio
 * header con "volver" y acá no se renderiza.
 */
const TABS = [
  { href: "/registrar", label: "Registrar", short: "Registrar", icon: "add_circle" },
  { href: "/registros", label: "Mis registros", short: "Mis registros", icon: "history" },
  { href: "/informes", label: "Informes del equipo", short: "Informes", icon: "groups" },
] as const;

const TOP_LEVEL = TABS.map((t) => t.href) as string[];

export function MainNav() {
  const pathname = usePathname();
  if (!TOP_LEVEL.includes(pathname)) return null;

  return (
    <>
      {/* Desktop: barra superior */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 h-touch-target-min bg-surface border-b border-outline-variant items-center px-container-margin gap-1">
        <span className="font-headline-sm text-headline-sm text-primary mr-4">EstoyAI</span>
        <div className="ml-auto flex items-center gap-1">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-label-md text-label-md transition-colors ${
                  active
                    ? "bg-surface-container-highest text-on-surface font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile: barra inferior (con safe-area de iOS) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 pb-[env(safe-area-inset-bottom)] box-content bg-surface border-t border-outline-variant grid grid-cols-3">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-on-surface-variant"
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {t.icon}
              </span>
              <span className="font-caption text-[11px] leading-none">{t.short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
