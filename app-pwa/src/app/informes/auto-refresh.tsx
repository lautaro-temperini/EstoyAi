"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-ejecuta el Server Component cada `seconds` para que el tablero avance solo
 * (RECIBIDO → LISTO) sin recargar la página ni una API route nueva.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Refresca al entrar: el Router Cache del cliente puede servir una lista
    // vieja (sin lo recién enviado a coordinación) hasta que algo la invalide.
    router.refresh();
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
