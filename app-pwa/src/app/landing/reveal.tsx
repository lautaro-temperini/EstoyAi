"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal liviano: GPU-only (opacity + transform), sin librerías.
 * - [data-reveal]  → fade+rise al entrar al viewport.
 * - [data-stagger] → los hijos directos reciben --reveal-delay escalonado;
 *                    se activan cuando el ancestro [data-reveal] tiene .is-in.
 * Sin JS, todo es visible (estado inicial oculto gateado por .landing-js).
 * prefers-reduced-motion → no agrega .landing-js.
 */
export function LandingReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("landing-js");

    // Asignar delays a hijos de [data-stagger]
    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((parent) => {
      Array.from(parent.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty("--reveal-delay", `${i * 70}ms`);
      });
    });

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.07 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
