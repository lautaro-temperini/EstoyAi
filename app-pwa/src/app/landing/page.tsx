import Link from "next/link";

/**
 * Landing pública EstoyAi (apex estoyai.com)
 *
 * Dirección visual: editorial institucional clara — fondo papel (#f8f9ff),
 * azul institucional dominante, verde para progreso/offline. Layout asimétrico
 * mobile-first; evita dark+verde ácido (startup) y cream+serif (ONG genérica).
 *
 * Elemento firma: diagrama voz → sede → .docx con pulso animado en el path.
 * Sin CTA de conversión (objetivo: comprensión, no captación).
 */

function LogoMark() {
  return (
    <svg
      className="landing-logo__mark"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="8" fill="#0040a1" />
      <path
        d="M12 24V12h3.2l4.8 7.4V12H23v12h-3.1l-4.9-7.6V24H12z"
        fill="#ffffff"
      />
      <circle cx="27" cy="11" r="3" fill="#006c49" />
    </svg>
  );
}

function FlowDiagram() {
  return (
    <figure className="landing-flow-diagram landing-anim landing-anim--3">
      <svg
        className="landing-flow-diagram__svg"
        viewBox="0 0 400 140"
        role="img"
        aria-labelledby="flow-diagram-title flow-diagram-desc"
      >
        <title id="flow-diagram-title">Flujo de EstoyAi</title>
        <desc id="flow-diagram-desc">
          El promotor graba en el celular, el audio se procesa en la sede de la
          ONG y se genera un informe Word para descargar.
        </desc>

        {/* Connection paths */}
        <path
          className="landing-flow-path"
          d="M 72 70 L 148 70"
        />
        <path
          className="landing-flow-path"
          d="M 252 70 L 328 70"
        />
        <path
          className="landing-flow-pulse"
          d="M 72 70 L 148 70 L 252 70 L 328 70"
        />

        {/* Node 1: mic / field */}
        <g transform="translate(36, 70)">
          <circle className="landing-flow-node__circle" r="36" />
          <g transform="translate(-12, -14)" fill="none" stroke="#0040a1" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="8" width="16" height="22" rx="8" />
            <path d="M12 30v6M8 36h8" />
            <path d="M20 18c2 1.5 3 3.5 3 6a7 7 0 0 1-14 0c0-2.5 1-4.5 3-6" />
          </g>
          <text
            y="52"
            textAnchor="middle"
            fill="#0d1c2e"
            fontFamily="Atkinson Hyperlegible Next, sans-serif"
            fontSize="11"
            fontWeight="600"
          >
            Campo
          </text>
        </g>

        {/* Node 2: sede / server */}
        <g transform="translate(200, 70)">
          <circle className="landing-flow-node__circle landing-flow-node__circle--active" r="36" />
          <g transform="translate(-14, -12)" fill="none" stroke="#0056d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="24" height="18" rx="2" />
            <path d="M8 26v4h12v-4M6 30h16" />
            <path d="M8 10h4M8 14h8M8 18h6" />
          </g>
          <text
            y="52"
            textAnchor="middle"
            fill="#0d1c2e"
            fontFamily="Atkinson Hyperlegible Next, sans-serif"
            fontSize="11"
            fontWeight="600"
          >
            Sede
          </text>
        </g>

        {/* Node 3: document */}
        <g transform="translate(364, 70)">
          <circle className="landing-flow-node__circle landing-flow-node__circle--done" r="36" />
          <g transform="translate(-10, -14)" fill="none" stroke="#006c49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h10l6 6v22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M16 2v6h6M8 14h12M8 18h10M8 22h8" />
          </g>
          <text
            y="52"
            textAnchor="middle"
            fill="#0d1c2e"
            fontFamily="Atkinson Hyperlegible Next, sans-serif"
            fontSize="11"
            fontWeight="600"
          >
            Informe
          </text>
        </g>
      </svg>
      <figcaption className="landing-flow-diagram__caption">
        Voz en el barrio → procesamiento en tu sede → .docx listo
      </figcaption>
    </figure>
  );
}

function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v3M9 22h6" />
    </svg>
  );
}

function IconOffline() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 20h.01M8.5 16.429a5 5 0 0 1 7.074 0M5 12.859a10 10 0 0 1 5.17-2.69M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.288-1.975M22 8.82a15 15 0 0 0-11.288-3.11" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6M8 9h2" />
    </svg>
  );
}

function IconWhisper() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v2" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.2.4 2.3 1 3.2A4 4 0 0 0 5 18a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4 4 4 0 0 0 0-7.4A5.5 5.5 0 0 0 12.5 2" />
      <path d="M12 2v20" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <header className="landing-header">
        <div className="landing__container landing-header__inner">
          <Link href="/" className="landing-logo" aria-label="EstoyAi — inicio">
            <LogoMark />
            <span className="landing-logo__text">EstoyAi</span>
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero: problema primero ── */}
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-hero__grid" aria-hidden="true" />
          <div className="landing__container landing-hero__layout">
            <div>
              <h1 id="hero-heading" className="landing-hero__title landing-anim landing-anim--1">
                Después de cada visita, media hora escribiendo lo que ya dijiste.
              </h1>
              <p className="landing-hero__lead landing-anim landing-anim--2">
                EstoyAi convierte la voz del promotor en un informe de seguimiento
                listo para archivar — en menos de 3 minutos, con o sin señal en el
                momento de la visita.
              </p>
              <p className="landing-hero__stat landing-anim landing-anim--3">
                <span className="landing-hero__stat-value">~30 min</span>
                <span className="landing-hero__stat-label">de redacción manual → ~2 min dictando</span>
              </p>
            </div>
            <FlowDiagram />
          </div>
        </section>

        {/* ── Flujo en 3 pasos ── */}
        <section className="landing__section" aria-labelledby="flow-heading">
          <div className="landing__container">
            <p className="landing__section-label">Cómo funciona</p>
            <h2 id="flow-heading" className="landing__headline-md">
              Un proceso real, en el orden en que ocurre
            </h2>
            <p className="landing__body-lg" style={{ marginTop: "1rem", maxWidth: "52ch" }}>
              No es magia en la nube: el promotor graba, la sede procesa, el
              informe queda listo para revisar y archivar.
            </p>

            <ol className="landing-steps" style={{ marginTop: "2.5rem", listStyle: "none", padding: 0 }}>
              <li className="landing-step">
                <span className="landing-step__num" aria-hidden="true">1</span>
                <h3 className="landing-step__title">El promotor graba en el celular</h3>
                <p className="landing-step__text">
                  Al terminar la visita, dicta lo que observó: contexto familiar,
                  intervención, acuerdos. Unos 2 minutos de audio, sin formularios
                  ni teclado.
                </p>
              </li>
              <li className="landing-step">
                <span className="landing-step__num" aria-hidden="true">2</span>
                <h3 className="landing-step__title">El audio viaja a la sede de la ONG</h3>
                <p className="landing-step__text">
                  Si no hay señal, el audio queda encolado en el teléfono y se
                  sube solo cuando vuelve la conexión. En la sede, un servidor
                  local transcribe y estructura el contenido.
                </p>
              </li>
              <li className="landing-step">
                <span className="landing-step__num" aria-hidden="true">3</span>
                <h3 className="landing-step__title">El informe aparece listo para descargar</h3>
                <p className="landing-step__text">
                  En menos de 3 minutos hay un archivo Word con 11 secciones fijas:
                  datos de la visita, intervención, acuerdos, observaciones. Misma
                  estructura para todos los promotores.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Propuesta de valor ── */}
        <section className="landing__section landing__section--tight" aria-labelledby="value-heading">
          <div className="landing__container">
            <p className="landing__section-label">Qué cambia en el día a día</p>
            <h2 id="value-heading" className="landing__headline-md">
              Menos tiempo escribiendo, más tiempo acompañando
            </h2>

            <div className="landing-values" style={{ marginTop: "2rem" }}>
              <article className="landing-value">
                <div className="landing-value__icon"><IconMic /></div>
                <h3 className="landing-value__title">El promotor dicta, no escribe</h3>
                <p className="landing-value__text">
                  Dos minutos de grabación reemplazan media hora de redacción
                  manual después de cada visita.
                </p>
              </article>
              <article className="landing-value">
                <div className="landing-value__icon"><IconOffline /></div>
                <h3 className="landing-value__title">Funciona sin internet</h3>
                <p className="landing-value__text">
                  El audio se guarda en el celular y sube en segundo plano cuando
                  hay señal. Las visitas en zonas sin cobertura no quedan sin
                  registrar.
                </p>
              </article>
              <article className="landing-value">
                <div className="landing-value__icon"><IconShield /></div>
                <h3 className="landing-value__title">Los datos no salen de la organización</h3>
                <p className="landing-value__text">
                  Transcripción y extracción corren en un servidor en la sede de
                  la ONG, no en servicios externos en la nube pública.
                </p>
              </article>
              <article className="landing-value">
                <div className="landing-value__icon"><IconDoc /></div>
                <h3 className="landing-value__title">Informes uniformes</h3>
                <p className="landing-value__text">
                  Once secciones fijas en cada informe, sin importar quién grabó.
                  Facilita el seguimiento y la auditoría entre equipos.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── Soberanía de datos ── */}
        <section className="landing__section landing-sovereignty" aria-labelledby="sovereignty-heading">
          <div className="landing__container landing-sovereignty__layout">
            <div>
              <p className="landing__section-label">Privacidad</p>
              <h2 id="sovereignty-heading" className="landing__headline-md">
                Los datos de tus beneficiarios se quedan en tu sede
              </h2>
              <p className="landing__body-lg" style={{ marginTop: "1rem" }}>
                EstoyAi está pensado para organizaciones que manejan información
                sensible de familias y menores. El procesamiento ocurre en hardware
                de la propia ONG — sin enviar audio ni transcripciones a APIs
                comerciales de terceros.
              </p>
              <p className="landing-boundary">
                <strong>Perímetro de datos:</strong> el audio viaja del celular del
                promotor al servidor de la sede. Ahí termina el recorrido. Nada se
                replica en infraestructura ajena a la organización.
              </p>
            </div>

            <div className="landing-stack" aria-label="Componentes del procesamiento local">
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconWhisper /></div>
                <div>
                  <p className="landing-stack__title">Transcripción local</p>
                  <p className="landing-stack__text">
                    faster-whisper corre en la sede. El audio no pasa por servicios
                    de reconocimiento de voz en la nube.
                  </p>
                </div>
              </div>
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconBrain /></div>
                <div>
                  <p className="landing-stack__title">Extracción con modelo local</p>
                  <p className="landing-stack__text">
                    Un LLM pequeño en la misma máquina estructura el texto en JSON
                    con campos fijos. Sin llamadas a APIs externas de inteligencia
                    artificial.
                  </p>
                </div>
              </div>
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconLock /></div>
                <div>
                  <p className="landing-stack__title">Acceso por organización</p>
                  <p className="landing-stack__text">
                    Cada ONG opera en su subdominio con acceso protegido. Los
                    informes viven en el servidor de la sede, bajo control del
                    equipo coordinador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── En producción: Pequeños Pasos ── */}
        <section className="landing__section" aria-labelledby="case-heading">
          <div className="landing__container landing-case">
            <div>
              <span className="landing-case__badge">En producción</span>
              <h2 id="case-heading" className="landing-case__org">
                Pequeños Pasos
              </h2>
              <p className="landing-case__context">
                ONG argentina que acompaña familias en situación de vulnerabilidad.
                Es el primer despliegue real de EstoyAi: promotores de campo que
                visitan hogares y necesitan dejar constancia escrita de cada
                encuentro.
              </p>
            </div>

            <div className="landing-case__panel">
              <h3 className="landing-case__panel-title">Qué cambió con EstoyAi</h3>
              <div className="landing-case__compare">
                <div className="landing-case__row">
                  <span className="landing-case__row-label landing-case__row-label--before">Antes</span>
                  <p className="landing-case__row-text">
                    Cada promotor redactaba informes a mano al volver de la visita.
                    <strong> ~30 minutos por registro</strong>, con datos incompletos
                    o ilegibles. En barrios sin señal, la visita quedaba sin
                    documentar hasta tener conectividad.
                  </p>
                </div>
                <div className="landing-case__row">
                  <span className="landing-case__row-label landing-case__row-label--after">Ahora</span>
                  <p className="landing-case__row-text">
                    Dicta un audio de un par de minutos al salir del domicilio.
                    La sede procesa y genera un <strong>.docx con 11 secciones</strong>{" "}
                    listo para archivar. El mismo formato para todo el equipo,
                    sin depender de internet en el momento de la grabación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Para quién es ── */}
        <section className="landing__section landing__section--tight" aria-labelledby="audience-heading">
          <div className="landing__container">
            <p className="landing__section-label">Para quién es</p>
            <h2 id="audience-heading" className="landing__headline-md">
              Organizaciones con trabajo de campo y poco margen para burocracia
            </h2>

            <div className="landing-audience" style={{ marginTop: "2rem" }}>
              <article className="landing-audience__item">
                <h3 className="landing-audience__title">ONGs con promotores en territorio</h3>
                <p className="landing-audience__text">
                  Equipos que visitan beneficiarios en sus hogares y necesitan
                  informes de seguimiento consistentes para coordinación interna
                  y rendición de cuentas.
                </p>
              </article>
              <article className="landing-audience__item">
                <h3 className="landing-audience__title">Operaciones con conectividad irregular</h3>
                <p className="landing-audience__text">
                  Barrios periféricos, zonas rurales o edificios donde la señal
                  falla. El registro ocurre en el momento de la visita aunque la
                  subida espere.
                </p>
              </article>
              <article className="landing-audience__item">
                <h3 className="landing-audience__title">Equipos sin formación técnica</h3>
                <p className="landing-audience__text">
                  Promotores que no son usuarios de software complejo. Grabar,
                  esperar y descargar — tres pasos que cualquier persona con
                  smartphone puede hacer.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing__container landing-footer__inner">
          <p className="landing-footer__contact">
            Consultas:{" "}
            <a href="mailto:contacto@estoyai.com">contacto@estoyai.com</a>
          </p>
          <p className="landing-footer__copy">© {year} EstoyAi</p>
        </div>
      </footer>
    </>
  );
}
