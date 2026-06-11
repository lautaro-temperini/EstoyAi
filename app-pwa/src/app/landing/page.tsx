import type { Metadata } from "next";

/**
 * Landing institucional pública (apex estoyai.com / www).
 *
 * NO es la app: no pide login y no da acceso al pipeline (grabar, registros…).
 * El middleware sirve esta página en el apex y redirige cualquier ruta de la
 * app de vuelta acá. Las ONGs usan sus subdominios (p. ej. pequenospasos.estoyai.com).
 *
 * Placeholder — rediseñar libremente. Estilos inline a propósito para que sea
 * visualmente independiente del design system de la app.
 */

export const metadata: Metadata = {
  title: "EstoyAi — Informes de campo por voz",
  description:
    "Plataforma para organizaciones sociales: convertí registros de voz en informes estructurados, en tu propia sede.",
};

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        background:
          "radial-gradient(1200px 600px at 50% -10%, #1b2b5c 0%, #0b1020 55%, #060912 100%)",
        color: "#e8ecf8",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 620 }}>
        <p
          style={{
            letterSpacing: "0.35em",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#7fa0ff",
            margin: 0,
          }}
        >
          ESTOYAI
        </p>
        <h1
          style={{
            fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
            lineHeight: 1.05,
            margin: "1.2rem 0 0.8rem",
            fontWeight: 800,
          }}
        >
          La voz del campo,
          <br />
          convertida en informes.
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.6,
            color: "#aab4d4",
            margin: "0 auto 2.2rem",
            maxWidth: 480,
          }}
        >
          Plataforma para organizaciones sociales. Los promotores graban una nota
          de voz y reciben un documento estructurado, listo para revisar — en la
          propia sede, sin depender de internet permanente.
        </p>
        <a
          href="mailto:latta.romero@gmail.com?subject=EstoyAi%20-%20Quiero%20sumar%20mi%20organizaci%C3%B3n"
          style={{
            display: "inline-block",
            padding: "0.9rem 1.8rem",
            borderRadius: 999,
            background: "#3b6cff",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Sumar mi organización
        </a>
      </div>
      <footer
        style={{
          position: "absolute",
          bottom: "1.4rem",
          fontSize: "0.8rem",
          color: "#5a6688",
        }}
      >
        © {new Date().getFullYear()} EstoyAi
      </footer>
    </main>
  );
}
