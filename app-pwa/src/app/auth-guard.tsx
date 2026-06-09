"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Guarda de sesión del lado del cliente. Si no hay flag `autenticado` en
 * sessionStorage, cualquier ruta que no sea el login ("/") redirige al login.
 * El login se renderiza siempre; las demás rutas esperan a la verificación.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/") {
      setReady(true);
      return;
    }
    let auth = false;
    try {
      auth = sessionStorage.getItem("autenticado") === "true";
    } catch {
      /* ignore */
    }
    if (!auth) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
