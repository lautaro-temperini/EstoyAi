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
 *
 * Narrativa: dolor → prueba (Pequeños Pasos) → flujo → soberanía (directorio)
 * → audiencia calificada. Open source en footer.
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
        viewBox="0 0 400 200"
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
          d="M 104 100 L 156 100"
          strokeOpacity="0.55"
        />
        <path
          className="landing-flow-path"
          d="M 244 100 L 296 100"
          strokeOpacity="0.55"
        />
        <path
          className="landing-flow-pulse"
          d="M 104 100 L 156 100 L 244 100 L 296 100"
        />

        {/* Timing labels on connectors */}
        <text
          x="130"
          y="88"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.5"
          fontFamily="Atkinson Hyperlegible Next, sans-serif"
          fontSize="10"
          fontWeight="600"
        >
          2 min
        </text>
        <text
          x="270"
          y="88"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.5"
          fontFamily="Atkinson Hyperlegible Next, sans-serif"
          fontSize="10"
          fontWeight="600"
        >
          &lt;3 min
        </text>

        {/* Node 1: mic / field */}
        <g transform="translate(60, 100)">
          <circle className="landing-flow-node__circle" r="44" />
          <g transform="translate(-12, -14)" fill="none" stroke="#0040a1" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="8" width="16" height="22" rx="8" />
            <path d="M12 30v6M8 36h8" />
            <path d="M20 18c2 1.5 3 3.5 3 6a7 7 0 0 1-14 0c0-2.5 1-4.5 3-6" />
          </g>
          <text
            y="68"
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
        <g transform="translate(200, 100)">
          <circle className="landing-flow-node__circle landing-flow-node__circle--active" r="44" />
          <g transform="translate(-14, -12)" fill="none" stroke="#0056d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="24" height="18" rx="2" />
            <path d="M8 26v4h12v-4M6 30h16" />
            <path d="M8 10h4M8 14h8M8 18h6" />
          </g>
          <text
            y="68"
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
        <g transform="translate(340, 100)">
          <circle className="landing-flow-node__circle landing-flow-node__circle--done" r="44" />
          <g transform="translate(-10, -14)" fill="none" stroke="#006c49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h10l6 6v22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M16 2v6h6M8 14h12M8 18h10M8 22h8" />
          </g>
          <text
            y="68"
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

function IconAudienceOrg() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <line x1="9" y1="9" x2="9" y2="9.01" />
      <line x1="15" y1="9" x2="15" y2="9.01" />
      <line x1="9" y1="13" x2="9" y2="13.01" />
      <line x1="15" y1="13" x2="15" y2="13.01" />
    </svg>
  );
}

function IconAudienceSignal() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 20h.01" />
      <path d="M6 20v-3" />
      <path d="M10 20v-6" opacity="0.35" />
      <path d="M14 20v-9" opacity="0.2" />
      <path d="M18 20V7" opacity="0.15" />
      <path d="M4 16.5 20 16.5" strokeDasharray="2 2" opacity="0.55" />
    </svg>
  );
}

function IconAudiencePerson() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="2.75" />
      <path d="M4 20v-1.25a5 5 0 0 1 10 0V20" />
      <path d="M16.5 9.5c.75.65 1.25 1.45 1.25 2.5" opacity="0.45" />
      <path d="M15 12.25a2.75 2.75 0 0 0-1 1.25" opacity="0.35" />
      <line x1="14.5" y1="7" x2="20.5" y2="15" />
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
                Salís de la casa a las 16:00. A las 16:45 seguís escribiendo el informe.
              </h1>
              <p className="landing-hero__lead landing-anim landing-anim--2">
                EstoyAi invierte ese flujo: el promotor dicta dos minutos al salir
                del domicilio; la sede de la ONG genera el Word — con o sin señal
                en el barrio. La voz de las familias no sale de la organización.
              </p>
              <p className="landing-hero__stat landing-anim landing-anim--3">
                <span className="landing-hero__stat-value">~30 min → ~2 min</span>
                <span className="landing-hero__stat-label">
                  de redacción manual a dictado en campo, por visita
                </span>
              </p>
            </div>
            <FlowDiagram />
          </div>
        </section>

        {/* ── En producción: Pequeños Pasos (prueba social temprana) ── */}
        <section className="landing__section" aria-labelledby="case-heading">
          <div className="landing__container landing-case">
            <div>
              <span className="landing-case__badge">En producción</span>
              <h2 id="case-heading" className="landing-case__org">
                Pequeños Pasos
              </h2>
              <p className="landing-case__context">
                ONG argentina que acompaña familias en situación de vulnerabilidad.
                Sus promotores visitan hogares y documentan cada encuentro con
                EstoyAi: dictado en campo, informe Word generado en la sede, mismo
                formato para todo el equipo.
              </p>
              <div className="landing-case__sections" aria-label="Secciones del informe">
                <span className="landing-case__section-tag">Intervención</span>
                <span className="landing-case__section-tag">Compromisos</span>
                <span className="landing-case__section-tag">Seguimiento</span>
                <span className="landing-case__section-tag">Vulnerabilidades</span>
                <span className="landing-case__section-tag">+7 secciones</span>
              </div>
              <p className="landing-case__footnote">
                Cada informe lo revisa el equipo coordinador antes de archivarlo.
                El sistema acelera la documentación; no reemplaza el criterio
                profesional.
              </p>
            </div>

            <div className="landing-case__panel">
              <h3 className="landing-case__panel-title">Qué cambió en el programa</h3>
              <div className="landing-case__compare">
                <div className="landing-case__row">
                  <span className="landing-case__row-label landing-case__row-label--before">Antes</span>
                  <p className="landing-case__row-text">
                    Informes redactados a mano al volver —{" "}
                    <strong>media hora por visita</strong>, a menudo incompletos.
                    Sin señal en el barrio, la visita quedaba sin registro hasta
                    otro día.
                  </p>
                </div>
                <div className="landing-case__row">
                  <span className="landing-case__row-label landing-case__row-label--after">Ahora</span>
                  <p className="landing-case__row-text">
                    Audio de un par de minutos al salir del domicilio. En{" "}
                    <strong>menos de 3 minutos</strong> la sede devuelve un .docx
                    con once secciones fijas. La visita queda registrada aunque
                    la subida espere conectividad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Flujo en 3 pasos ── */}
        <section className="landing__section landing__section--flow" aria-labelledby="flow-heading">
          <div className="landing__container">
            <p className="landing__section-label">Cómo funciona</p>
            <h2 id="flow-heading" className="landing__headline-md">
              Grabá al salir. Archivá desde la sede.
            </h2>
            <p className="landing__body-lg">
              Tres pasos. Sin formularios en la calle. El archivo sigue siendo
              Word — el que ya usás para rendir cuentas.
            </p>

            <div className="landing-flow-panel">
              <ol className="landing-steps" style={{ listStyle: "none", padding: 0 }}>
                <li className="landing-step">
                  <span className="landing-step__num" aria-hidden="true">1</span>
                  <h3 className="landing-step__title">Dictá al salir del domicilio</h3>
                  <p className="landing-step__text">
                    Contexto familiar, intervención, acuerdos — unos 2 minutos de
                    audio en el celular. Sin teclado ni pantallas en la vereda.
                  </p>
                </li>
                <li className="landing-step">
                  <span className="landing-step__num" aria-hidden="true">2</span>
                  <h3 className="landing-step__title">La sede procesa el audio</h3>
                  <p className="landing-step__text">
                    Sin señal, el audio queda encolado y sube solo cuando hay red.
                    En la sede se transcribe y se ordena en las secciones del
                    informe — en hardware de la propia organización.
                  </p>
                </li>
                <li className="landing-step">
                  <span className="landing-step__num" aria-hidden="true">3</span>
                  <h3 className="landing-step__title">Descargá el Word y archivá</h3>
                  <p className="landing-step__text">
                    En menos de 3 minutos hay un .docx listo para que el coordinador
                    lo revise. Once secciones fijas, la misma estructura para todos
                    los promotores.
                  </p>
                </li>
              </ol>

              <div className="landing-flow-note" aria-label="Resumen del impacto">
                <p className="landing-flow-note__item">
                  <strong>Tiempo recuperado</strong>
                  De ~30 min de redacción a ~2 min de dictado por visita.
                </p>
                <p className="landing-flow-note__item">
                  <strong>Territorio</strong>
                  La visita se registra en el momento, aunque el barrio no tenga señal.
                </p>
                <p className="landing-flow-note__item">
                  <strong>Archivo uniforme</strong>
                  Un solo formato de informe para coordinación y auditoría interna.
                </p>
              </div>
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
                Para organizaciones que documentan visitas domiciliarias con
                información sensible de familias y menores. El audio va del celular
                del promotor al servidor de la sede: ahí se transcribe, se arma el
                informe y se guarda. Sin enviar voz ni texto a servicios comerciales
                de reconocimiento de voz ni de inteligencia artificial en la nube.
              </p>
              <p className="landing-boundary">
                <strong>Perímetro de datos:</strong> el recorrido termina en tu
                sede. Nada se replica en infraestructura ajena a la organización.
                Operación pensada para hardware modesto en la ONG, sin GPU dedicada.
              </p>
            </div>

            <div className="landing-stack" aria-label="Garantías de procesamiento local">
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconWhisper /></div>
                <div>
                  <p className="landing-stack__title">Voz transcrita en la sede</p>
                  <p className="landing-stack__text">
                    El audio se convierte en texto en un servidor de tu organización,
                    no en plataformas comerciales de reconocimiento de voz.
                  </p>
                </div>
              </div>
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconBrain /></div>
                <div>
                  <p className="landing-stack__title">Informe ordenado en la sede</p>
                  <p className="landing-stack__text">
                    Lo dictado se distribuye en las secciones del informe en la
                    misma máquina — sin ChatGPT ni APIs externas de IA.
                  </p>
                </div>
              </div>
              <div className="landing-stack__item">
                <div className="landing-stack__icon"><IconLock /></div>
                <div>
                  <p className="landing-stack__title">Control institucional</p>
                  <p className="landing-stack__text">
                    Cada organización opera en su propio acceso. Los informes viven
                    en el servidor de la sede, bajo responsabilidad del equipo
                    coordinador.
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
              Visitas domiciliarias, datos sensibles, equipos de campo
            </h2>

            <div className="landing-audience" style={{ marginTop: "2rem" }}>
              <article className="landing-audience__item">
                <div className="landing-audience__icon" aria-hidden="true">
                  <IconAudienceOrg />
                </div>
                <h3 className="landing-audience__title">Programas con promotores en hogares</h3>
                <p className="landing-audience__text">
                  Contención familiar, primera infancia, acompañamiento territorial —
                  donde cada visita necesita quedar escrita para el equipo y para
                  rendir cuentas ante financiadores.
                </p>
              </article>
              <article className="landing-audience__item">
                <div className="landing-audience__icon" aria-hidden="true">
                  <IconAudienceSignal />
                </div>
                <h3 className="landing-audience__title">Territorio con señal irregular</h3>
                <p className="landing-audience__text">
                  Barrios periféricos, zonas rurales, edificios donde la conexión
                  falla. El registro ocurre al salir de la visita; la subida puede
                  esperar.
                </p>
              </article>
              <article className="landing-audience__item">
                <div className="landing-audience__icon" aria-hidden="true">
                  <IconAudiencePerson />
                </div>
                <h3 className="landing-audience__title">Promotores sin perfil técnico</h3>
                <p className="landing-audience__text">
                  Si saben grabar un audio de WhatsApp, pueden usar EstoyAi. No hay
                  formularios largos ni capacitación en software complejo.
                </p>
              </article>
            </div>

            <aside className="landing-not-for" aria-labelledby="not-for-heading">
              <h3 id="not-for-heading" className="landing-not-for__title">
                No es para
              </h3>
              <ul className="landing-not-for__list">
                <li>
                  Organizaciones que buscan un CRM o gestión integral de casos —
                  EstoyAi documenta visitas, no reemplaza un sistema de seguimiento
                  completo.
                </li>
                <li>
                  Programas que no registran visitas domiciliarias por escrito.
                </li>
                <li>
                  Equipos dispuestos a enviar datos de beneficiarios a la nube
                  pública por conveniencia operativa.
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing__container landing-footer__inner">
          <div>
            <p className="landing-footer__contact">
              Consultas:{" "}
              <a href="mailto:contacto@estoyai.com">contacto@estoyai.com</a>
            </p>
            <p className="landing-footer__oss">
              Código abierto (MIT) ·{" "}
              <a
                href="https://github.com/lautaro-temperini/EstoyAi"
                rel="noopener noreferrer"
                target="_blank"
              >
                github.com/lautaro-temperini/EstoyAi
              </a>
            </p>
          </div>
          <p className="landing-footer__copy">© {year} EstoyAi</p>
        </div>
      </footer>
    </>
  );
}
