import Link from "next/link";
import { LandingReveal } from "./reveal";

/**
 * Landing pública EstoyAi (apex estoyai.com)
 *
 * Dirección visual: Civic utilitario sobre tokens de "Supportive Insight".
 * Grilla suiza, alto contraste, tipografía masiva, estructura por reglas
 * suaves + radios. Aislada de globals.css; misma paleta de marca.
 *
 * Estructura (11 elementos, adaptados a adopción de ONG, no venta SaaS):
 *   Header (logo + nav + CTA) → Hero (título + CTA + social proof) →
 *   Problema → Cómo funciona (índice + schematic) → Por qué es diferente →
 *   Soberanía (spotlight) → Caso Pequeños Pasos → Para quién → FAQ →
 *   CTA final → Footer.
 *
 * Fuente de copy: docs/brief.md. Elemento firma: índice 01/02/03.
 */

const CONTACT_EMAIL = "latta.romero@gmail.com";
const GITHUB_URL = "https://github.com/lautaro-temperini/EstoyAi";
/** Ruta del video demo en /public (ej. "/demo.mp4"). Vacío → muestra la ilustración. */
const DEMO_SRC = "";

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="landing-logo__mark" src="/favicon.ico" width={34} height={34} alt="" aria-hidden="true" />;
}

/** Iconos Material Symbols — mismo set que la PWA operativa. */
function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

/** Schematic Campo → Sede → .docx. Horizontal en desktop, vertical en mobile. */
function FlowSchematic() {
  return (
    <figure className="landing-flow">
      {/* ── Desktop: horizontal ── */}
      <svg
        className="landing-flow__svg landing-flow__svg--h"
        viewBox="0 0 360 96"
        role="img"
        aria-labelledby="flow-title flow-desc"
      >
        <title id="flow-title">Flujo de EstoyAi</title>
        <desc id="flow-desc">
          El promotor graba en el celular, el audio se procesa en la sede de la
          ONG y se genera un informe Word para descargar.
        </desc>

        <line className="landing-flow__line" x1="64" y1="40" x2="296" y2="40" />
        <path className="landing-flow__pulse" d="M 64 40 L 296 40" />

        <g transform="translate(28, 26)">
          <rect className="landing-flow__node" x="0" y="0" width="36" height="28" />
          <g transform="translate(13, 6)" fill="none" stroke="#0040a1" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="0" width="6" height="11" rx="3" />
            <path d="M0 8a6 6 0 0 0 12 0M6 14v3" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#424654" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">Campo</text>
        </g>

        <g transform="translate(162, 26)">
          <rect className="landing-flow__node landing-flow__node--mid" x="0" y="0" width="36" height="28" />
          <g transform="translate(10, 8)" fill="none" stroke="#0056d2" strokeWidth="1.5" strokeLinecap="round">
            <rect x="0" y="0" width="16" height="11" rx="1" />
            <path d="M3 14h10M5 11v3M11 11v3" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#424654" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">Sede</text>
        </g>

        <g transform="translate(296, 26)">
          <rect className="landing-flow__node landing-flow__node--end" x="0" y="0" width="36" height="28" />
          <g transform="translate(11, 6)" fill="none" stroke="#006c49" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 0h7l4 4v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1z" />
            <path d="M9 0v4h4M4 9h6M4 12h5" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#006c49" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">.docx</text>
        </g>
      </svg>
      {/* ── Mobile: vertical ── */}
      <svg
        className="landing-flow__svg landing-flow__svg--v"
        viewBox="0 0 120 218"
        role="img"
        aria-label="Flujo vertical: Campo → Sede → .docx"
      >
        {/* Líneas conectoras */}
        <line className="landing-flow__line" x1="60" y1="38" x2="60" y2="82" />
        <path className="landing-flow__pulse--v" d="M 60 38 L 60 82" />
        <line className="landing-flow__line" x1="60" y1="110" x2="60" y2="154" />
        <path className="landing-flow__pulse--v" d="M 60 110 L 60 154" />

        {/* Campo */}
        <g transform="translate(42, 10)">
          <rect className="landing-flow__node" x="0" y="0" width="36" height="28" rx="6" />
          <g transform="translate(13, 6)" fill="none" stroke="#0040a1" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="0" width="6" height="11" rx="3" />
            <path d="M0 8a6 6 0 0 0 12 0M6 14v3" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#424654" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">Campo</text>
        </g>

        {/* Sede */}
        <g transform="translate(42, 82)">
          <rect className="landing-flow__node landing-flow__node--mid" x="0" y="0" width="36" height="28" rx="6" />
          <g transform="translate(10, 8)" fill="none" stroke="#0056d2" strokeWidth="1.5" strokeLinecap="round">
            <rect x="0" y="0" width="16" height="11" rx="1" />
            <path d="M3 14h10M5 11v3M11 11v3" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#424654" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">Sede</text>
        </g>

        {/* .docx */}
        <g transform="translate(42, 154)">
          <rect className="landing-flow__node landing-flow__node--end" x="0" y="0" width="36" height="28" rx="6" />
          <g transform="translate(11, 6)" fill="none" stroke="#006c49" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 0h7l4 4v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1z" />
            <path d="M9 0v4h4M4 9h6M4 12h5" />
          </g>
          <text x="18" y="46" textAnchor="middle" fill="#006c49" fontFamily="Atkinson Hyperlegible Next, sans-serif" fontSize="10" fontWeight="700">.docx</text>
        </g>
      </svg>

      <figcaption className="landing-flow__caption">
        Voz en el barrio → tu sede → .docx en menos de 3 min
      </figcaption>
    </figure>
  );
}

/** Mock de teléfono: pantalla de grabación del promotor en campo. */
function PhoneMock() {
  return (
    <div className="landing-phone-mock" aria-label="Vista previa de la app en el celular del promotor">
      <svg className="landing-phone-mock__svg" viewBox="0 0 200 360" aria-hidden="true">
        <rect x="4" y="4" width="192" height="352" rx="28" fill="#0d1c2e" />
        <rect x="16" y="20" width="168" height="320" rx="16" fill="#eff4ff" />
        <rect x="76" y="8" width="48" height="12" rx="6" fill="#0d1c2e" />
        <rect x="16" y="20" width="168" height="40" rx="16" fill="#0040a1" />
        <rect x="16" y="44" width="168" height="16" fill="#0040a1" />
        <text x="100" y="46" textAnchor="middle" fill="white" fontFamily="sans-serif" fontSize="12" fontWeight="700">EstoyAi</text>
        <circle cx="100" cy="168" r="46" fill="white" />
        <circle cx="100" cy="168" r="38" fill="#eff4ff" />
        <rect x="93" y="152" width="14" height="24" rx="7" fill="#0040a1" />
        <path d="M86 170a14 14 0 0 0 28 0M100 184v8M93 192h14" fill="none" stroke="#0040a1" strokeWidth="2.5" strokeLinecap="round" />
        <g stroke="#006c49" strokeWidth="3" strokeLinecap="round">
          <line x1="36" y1="232" x2="36" y2="242" /><line x1="48" y1="226" x2="48" y2="248" />
          <line x1="60" y1="219" x2="60" y2="255" /><line x1="72" y1="228" x2="72" y2="246" />
          <line x1="84" y1="221" x2="84" y2="253" /><line x1="96" y1="215" x2="96" y2="259" />
          <line x1="108" y1="222" x2="108" y2="252" /><line x1="120" y1="218" x2="120" y2="256" />
          <line x1="132" y1="226" x2="132" y2="248" /><line x1="144" y1="221" x2="144" y2="253" />
          <line x1="156" y1="232" x2="156" y2="242" /><line x1="168" y1="228" x2="168" y2="246" />
        </g>
        <circle cx="72" cy="284" r="5" fill="#e53935" />
        <text x="83" y="288" fill="#424654" fontFamily="sans-serif" fontSize="11" fontWeight="600">Grabando… 0:47</text>
        <rect x="64" y="304" width="72" height="28" rx="14" fill="#0040a1" />
        <text x="100" y="323" textAnchor="middle" fill="white" fontFamily="sans-serif" fontSize="11" fontWeight="600">Detener</text>
      </svg>
    </div>
  );
}

/** Placeholder del video demo — reemplazado por <video> cuando DEMO_SRC está seteado. */
function VideoPlaceholder() {
  return (
    <div className="landing-video-placeholder" role="img" aria-label="Demo de EstoyAi — disponible próximamente">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="35" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <polygon points="29,22 53,36 29,50" fill="rgba(255,255,255,0.85)" />
      </svg>
      <p className="landing-video-placeholder__label">Demo disponible próximamente</p>
    </div>
  );
}


const PROBLEMS = [
  {
    icon: "signal_disconnected",
    title: "El registro ocurre donde no hay red",
    text: "El promotor no puede abrir un formulario online en una zona vulnerable. Lo que no anota en el momento se reconstruye de memoria — con sesgo, omisiones y sin el contexto del terreno.",
  },
  {
    icon: "hub",
    title: "El historial está fragmentado",
    text: "Una misma persona tiene datos en un cuaderno, un grupo de WhatsApp y una planilla que nadie actualiza hace meses. Seguir su evolución en el tiempo (lo que piden los financiadores) se vuelve imposible.",
  },
  {
    icon: "description",
    title: "Los informes cuestan más de lo que valen",
    text: "Cada informe es una reconstrucción manual hecha por alguien que no estuvo en campo. Horas de trabajo para producir un documento inconsistente que no refleja lo que pasó.",
  },
];

const BENEFITS: {
  icon: string;
  title: string;
  text: string;
  accent?: boolean;
}[] = [
  { icon: "shield_lock", title: "Los datos no salen", text: "Transcripción, procesamiento y almacenamiento corren en la sede. El audio y los datos de menores y familias nunca pasan por servidores externos ni por IA en la nube." },
  { icon: "money_off", title: "Gratuito", text: "Sin licencias, sin suscripciones, sin costos por uso. Una ONG lo instala, lo usa y lo escala sin pagar nada." },
  { icon: "code", title: "Código abierto", text: "El código es público. Cualquier organización o equipo técnico puede auditarlo, adaptarlo o mejorarlo." },
  { icon: "cloud_off", title: "Funciona sin internet", text: "El promotor graba en zona sin señal. El audio se encola en el celular y sube solo cuando hay conexión." },
  { icon: "memory", title: "Corre en hardware modesto", text: "Funciona en PCs con 8GB de RAM, del tipo que las ONGs reciben como donación. La IA corre localmente." },
  { icon: "tune", title: "Adaptable a cualquier ONG", text: "Programas, campos del informe y estructura de datos se configuran por organización. Es configuración, no código." },
];

const NOT_FOR = [
  { icon: "manage_accounts", text: "Un CRM o sistema integral de seguimiento y gestión de casos de beneficiarios." },
  { icon: "calculate", text: "Herramientas de administración, contabilidad o gestión institucional." },
  { icon: "cloud", text: "Plataformas pensadas para organizaciones que prefieren operar íntegramente en la nube." },
];

const AUDIENCES = [
  { icon: "hiking", title: "Promotores y trabajadores de campo", text: "Necesitan algo que funcione rápido, en cualquier celular, aunque no haya señal. No quieren aprender software nuevo ni escribir informes al volver a casa." },
  { icon: "fact_check", title: "Coordinadores de sede", text: "Consolidan la información y rinden cuentas. Necesitan informes completos, con estructura consistente, sin depender de que cada promotor los redacte distinto." },
  { icon: "verified", title: "Organizaciones con financiamiento externo", text: "Tienen que demostrar impacto con datos. Necesitan evidencia estructurada, no reconstrucciones manuales de fin de año.", accent: true },
];

const FAQS = [
  { q: "¿Cuánto cuesta?", a: "Nada. EstoyAi es gratuito y de código abierto. No hay licencias, suscripciones ni costos por uso. Tu organización lo instala y lo escala sin pagar." },
  { q: "¿Necesito un equipo técnico para instalarlo?", a: "No. La instalación está pensada para equipos sin experiencia técnica: un asistente paso a paso, guías en castellano y soporte para la puesta en marcha. Si la organización tiene alguien con conocimientos básicos de computación, es suficiente." },
  { q: "¿Funciona sin internet en el barrio?", a: "Sí. El promotor graba en zona sin señal; el audio se encola en el celular y sube solo cuando hay conexión, sin que tenga que hacer nada." },
  { q: "¿Dónde quedan los datos de los beneficiarios?", a: "En la sede de tu organización. Transcripción, procesamiento con IA y almacenamiento corren localmente. Ningún audio ni dato sale a servidores externos." },
  { q: "¿Qué hardware necesito?", a: "Una computadora de escritorio común, del tipo que las ONGs suelen recibir como donación. Sin servidores en la nube ni equipos especiales; todo corre en la sede de la organización." },
  { q: "¿Sirve para mi tipo de organización?", a: "Probablemente. El sistema no está atado a un tipo de intervención: programas, campos del informe y estructura de datos se configuran por ONG. Lo que hoy registra visitas domiciliarias se adapta a otro seguimiento sin tocar código." },
  { q: "¿Hay organizaciones usándolo hoy?", a: "Todavía no en producción. EstoyAi se construyó en Halketon (junio 2026) como MVP funcional, basado en investigación con 16 organizaciones. Buscamos las primeras para un piloto real; si tu equipo trabaja en territorio, escribinos." },
];

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <header className="landing-header">
        <div className="landing__container landing-header__inner">
          <Link href="/landing" className="landing-logo" aria-label="EstoyAi — inicio">
            <LogoMark />
            <span className="landing-logo__text">EstoyAi</span>
          </Link>
          <div className="landing-header__actions">
            <nav className="landing-header__nav" aria-label="Secciones">
              <a className="landing-header__link" href="#como-funciona">Cómo funciona</a>
              <a className="landing-header__link" href="#por-que">Por qué es diferente</a>
              <a className="landing-header__link" href="#faq">Preguntas</a>
            </nav>
            <a className="landing-btn landing-btn--primary landing-header__cta" href={`mailto:${CONTACT_EMAIL}`}>
              Hablemos
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing__container">
            <div className="landing-hero__layout">
              <div>
                <h1 id="hero-heading" className="landing-hero__title landing-anim landing-anim--1">
                  La ONG hace el trabajo.<br />
                  <em>EstoyAi lo deja escrito.</em>
                </h1>

                <p className="landing-hero__lead landing-anim landing-anim--2">
                  Las ONGs que trabajan en territorio acumulan evidencia en cuadernos,
                  WhatsApp y planillas. EstoyAi convierte lo que el promotor dicta
                  en un informe Word, sin conexión y sin que los datos salgan de la organización.
                </p>
                <div className="landing-hero__cta-group landing-anim landing-anim--3">
                  <div className="landing-hero__ctas">
                    <a className="landing-btn landing-btn--primary" href={`mailto:${CONTACT_EMAIL}`}>
                      <Icon name="mail" size={20} /> Pedir una demo
                    </a>
                    <a className="landing-btn landing-btn--ghost" href="#en-accion">
                      Ver cómo funciona
                    </a>
                  </div>
                </div>
              </div>

              <div className="landing-hero__aside landing-anim landing-anim--3">
                <PhoneMock />
              </div>
            </div>

            <div className="landing-hero__proof-row landing-anim landing-anim--4">
              <div className="landing-hero__proof">
                <div className="landing-proof-item">
                  <span className="landing-proof-item__value">13 de 16 ONGs</span>
                  <span className="landing-proof-item__label">investigadas enfrentaban este problema</span>
                </div>
                <div className="landing-proof-item">
                  <span className="landing-proof-item__value landing-proof-item__value--green">Gratis · Código abierto</span>
                  <span className="landing-proof-item__label">auditable y sin costos de licencia</span>
                </div>
              </div>
              <FlowSchematic />
            </div>
          </div>
        </section>

        {/* ── Problema ── */}
        <section className="landing__section landing__section--dark" data-reveal aria-labelledby="problem-heading">
          <div className="landing__container">
            <p className="landing__eyebrow" data-index="01"><span>El problema real</span></p>
            <h2 id="problem-heading" className="landing__h2">
              El problema no está en la intervención. Está en cómo se registra.
            </h2>
            <p className="landing__lead">
              Las ONGs que trabajan en territorio hacen trabajo valioso pero no pueden
              demostrarlo. El financiamiento queda en riesgo no por falta de impacto,
              sino por falta de evidencia.
            </p>

            <div className="landing-problem" data-stagger>
              {PROBLEMS.map((p) => (
                <article key={p.title} className="landing-problem__cell">
                  <span className="landing-problem__icon"><Icon name={p.icon} /></span>
                  <h3 className="landing-problem__title">{p.title}</h3>
                  <p className="landing-problem__text">{p.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="landing__section" id="como-funciona" data-reveal aria-labelledby="flow-heading">
          <div className="landing__container">
            <p className="landing__eyebrow" data-index="02"><span>Cómo funciona</span></p>
            <h2 id="flow-heading" className="landing__h2">
              Grabá al salir. Archivá desde la sede.
            </h2>
            <p className="landing__lead">
              Tres pasos. Sin formularios en la calle. El archivo sigue siendo Word,
              el que ya usás para rendir cuentas.
            </p>

            <ol className="landing-index" style={{ listStyle: "none", margin: 0, padding: 0 }} data-stagger>
              <li className="landing-index__row">
                <span className="landing-index__num" aria-hidden="true">01</span>
                <div className="landing-index__body">
                  <h3 className="landing-index__title">Dictá al salir del domicilio</h3>
                  <p className="landing-index__text">
                    Contexto familiar, intervención, acuerdos: unos 2 minutos de audio
                    en el celular. Sin teclado ni pantallas en la vereda.
                  </p>
                </div>
              </li>
              <li className="landing-index__row">
                <span className="landing-index__num" aria-hidden="true">02</span>
                <div className="landing-index__body">
                  <h3 className="landing-index__title">La sede procesa el audio</h3>
                  <p className="landing-index__text">
                    Sin señal, el audio queda encolado y sube solo cuando hay red. En la
                    sede se transcribe y se extraen los datos con IA local, en hardware
                    de la propia organización.
                  </p>
                </div>
              </li>
              <li className="landing-index__row">
                <span className="landing-index__num" aria-hidden="true">03</span>
                <div className="landing-index__body">
                  <h3 className="landing-index__title">Descargá el Word y archivá</h3>
                  <p className="landing-index__text">
                    En menos de 5 minutos hay un .docx listo para que el coordinador lo
                    revise. Secciones fijas, la misma estructura para todos los promotores.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── En acción: video demo + preview del resultado ── */}
        <section className="landing__section landing__section--dark" id="en-accion" data-reveal aria-labelledby="media-heading">
          <div className="landing__container">
            <p className="landing__eyebrow"><span>En acción</span></p>
            <h2 id="media-heading" className="landing__h2">
              Del audio al informe, sin pasar por el teclado
            </h2>
            <p className="landing__lead">
              El promotor habla; el sistema escucha, ordena y escribe. Lo que llega a
              la sede no es un audio suelto: es un .docx con la misma estructura para
              todo el equipo, listo para revisar y archivar.
            </p>
            <div className="landing-media__full">
              {DEMO_SRC ? (
                <video className="landing-media__video" controls preload="none" playsInline>
                  <source src={DEMO_SRC} type="video/mp4" />
                </video>
              ) : (
                <VideoPlaceholder />
              )}
            </div>
          </div>
        </section>

        {/* ── Por qué es diferente ── */}
        <section className="landing__section" id="por-que" data-reveal aria-labelledby="why-heading">
          <div className="landing__container">
            <p className="landing__eyebrow" data-index="03"><span>Por qué es diferente</span></p>
            <h2 id="why-heading" className="landing__h2">
              Diseñado desde las restricciones reales de las ONGs, no a pesar de ellas
            </h2>
            <p className="landing__lead">
              La mayoría de las soluciones asumen conectividad estable, presupuesto para
              licencias y equipos técnicos. Nada de eso describe a las organizaciones que
              más necesitan sistematizar.
            </p>

            <div className="landing-why" data-stagger>
              {BENEFITS.map((b) => (
                <article
                  key={b.title}
                  className={`landing-why__cell${b.accent ? " landing-why__cell--accent" : ""}`}
                >
                  <span className="landing-why__icon"><Icon name={b.icon} /></span>
                  <h3 className="landing-why__title">{b.title}</h3>
                  <p className="landing-why__text">{b.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Soberanía (spotlight del diferencial más fuerte) ── */}
        <section className="landing__section landing-sov" data-reveal aria-labelledby="sov-heading">
          <div className="landing__container landing-sov__layout">
            <div>
              <p className="landing__eyebrow"><span>Soberanía de datos</span></p>
              <h2 id="sov-heading" className="landing-sov__title">
                Los datos de tus beneficiarios se quedan en tu sede
              </h2>
              <p className="landing-sov__lead">
                Para organizaciones que documentan visitas con información sensible de
                familias y menores. El audio va del celular del promotor al servidor de
                la sede: ahí se transcribe, se arma el informe y se guarda. Sin enviar voz
                ni texto a servicios comerciales de reconocimiento de voz ni de IA.
              </p>
              <p className="landing-sov__boundary">
                <strong>Perímetro de datos:</strong> el recorrido termina en tu sede.
                Nada se replica en infraestructura ajena a la organización.
              </p>
            </div>

            <div aria-label="Garantías de procesamiento local" data-stagger>
              <div className="landing-guarantee">
                <span className="landing-guarantee__icon"><Icon name="mic" /></span>
                <div>
                  <p className="landing-guarantee__title">Voz transcrita en la sede</p>
                  <p className="landing-guarantee__text">
                    El audio se convierte en texto en un servidor de tu organización, no
                    en plataformas comerciales de reconocimiento de voz.
                  </p>
                </div>
              </div>
              <div className="landing-guarantee">
                <span className="landing-guarantee__icon"><Icon name="psychology" /></span>
                <div>
                  <p className="landing-guarantee__title">Datos extraídos en la sede</p>
                  <p className="landing-guarantee__text">
                    La IA distribuye lo dictado en las secciones del informe en la misma
                    máquina — sin ChatGPT ni APIs externas.
                  </p>
                </div>
              </div>
              <div className="landing-guarantee">
                <span className="landing-guarantee__icon"><Icon name="lock" /></span>
                <div>
                  <p className="landing-guarantee__title">Control institucional</p>
                  <p className="landing-guarantee__text">
                    Cada organización opera en su propio acceso. Los informes viven en el
                    servidor de la sede, bajo responsabilidad del equipo coordinador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Para quién es ── */}
        <section className="landing__section" data-reveal aria-labelledby="audience-heading">
          <div className="landing__container">
            <p className="landing__eyebrow" data-index="05"><span>Para quién es</span></p>
            <h2 id="audience-heading" className="landing__h2">
              Equipos de campo, coordinadores de sede y ONGs que rinden cuentas
            </h2>

            <div className="landing-aud" data-stagger>
              {AUDIENCES.map((a) => (
                <article key={a.title} className="landing-aud__cell">
                  <span className="landing-aud__icon"><Icon name={a.icon} /></span>
                  <h3 className="landing-aud__title">{a.title}</h3>
                  <p className="landing-aud__text">{a.text}</p>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* ── Lo que no reemplaza ── */}
        <section className="landing__section landing__section--dark" data-reveal aria-labelledby="notfor-heading">
          <div className="landing__container">
            <p className="landing__eyebrow"><span>Alcance</span></p>
            <h2 id="notfor-heading" className="landing__h2">
              Lo que EstoyAi no reemplaza
            </h2>
            <p className="landing__lead">
              Está enfocado en un problema específico: documentar trabajo de campo de
              forma rápida, sin conexión y sin que los datos salgan de la organización.
              No intenta ser un sistema integral de gestión.
            </p>
            <ul className="landing-scope" data-stagger>
              {NOT_FOR.map((n) => (
                <li key={n.text} className="landing-scope__item">
                  <span className="landing-scope__icon"><Icon name={n.icon} /></span>
                  <span className="landing-scope__text">{n.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="landing__section" id="faq" data-reveal aria-labelledby="faq-heading">
          <div className="landing__container">
            <p className="landing__eyebrow" data-index="06"><span>Preguntas frecuentes</span></p>
            <h2 id="faq-heading" className="landing__h2">Lo que toda ONG pregunta primero</h2>

            <div className="landing-faq" data-stagger>
              {FAQS.map((f) => (
                <details key={f.q} className="landing-faq__item">
                  <summary className="landing-faq__q">
                    {f.q}
                    <span className="landing-faq__icon"><Icon name="expand_more" /></span>
                  </summary>
                  <p className="landing-faq__a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── De dónde viene ── */}
        <section className="landing__section landing__section--dark" data-reveal aria-labelledby="origin-heading">
          <div className="landing__container">
            <p className="landing__eyebrow"><span>De dónde viene</span></p>
            <h2 id="origin-heading" className="landing__h2">
              Diseñado con organizaciones reales, no en un escritorio
            </h2>
            <p className="landing__lead">
              EstoyAi nació en Halketon, una hackathon solidaria organizada por Paisanos,
              Crecimiento Build, Querido Lunes y Fardo. El brief se construyó desde
              16 entrevistas a organizaciones argentinas de la sociedad civil. El patrón
              se repetía en casi todas: los datos de campo se perdían entre cuadernos,
              WhatsApp y planillas.
            </p>

            <div className="landing-compare" data-stagger>
              <div className="landing-compare__row">
                <span className="landing-compare__label landing-compare__label--before">El patrón</span>
                <p className="landing-compare__text">
                  Cuadernos, grupos de WhatsApp y planillas de Excel. Cada paso entre ellos
                  es una transcripción a mano. Cuando un financiador pide evidencia, el
                  equipo reconstruye el año entero desde cero.
                </p>
              </div>
              <div className="landing-compare__row">
                <span className="landing-compare__label landing-compare__label--after">El enfoque</span>
                <p className="landing-compare__text">
                  El promotor dicta un par de minutos al salir. En menos de 3 minutos la
                  sede genera un .docx con estructura fija, sin redactar, sin conexión y
                  sin que los datos salgan de la organización.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="landing__section landing-final" data-reveal aria-labelledby="final-heading">
          <div className="landing__container landing-final__layout">
            <h2 id="final-heading" className="landing-final__title">
              ¿Tu organización quiere registrar mejor lo que ya hace?
            </h2>
            <p className="landing-final__lead">
              Buscamos las primeras organizaciones para implementar EstoyAi. Es gratis,
              de código abierto y se adapta a tu tipo de intervención. Si tu equipo trabaja en
              territorio, escribinos y vemos juntos cómo encaja en tu sede.
            </p>
            <div className="landing-final__ctas">
              <a className="landing-btn landing-btn--primary" href={`mailto:${CONTACT_EMAIL}`}>
                <Icon name="mail" size={20} /> Hablar sobre mi organización
              </a>
              <a className="landing-btn landing-btn--ghost" href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
                <Icon name="code" size={20} /> Ver el código
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing__container landing-footer__inner">
          <div>
            <p className="landing-footer__contact">
              Consultas: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <p className="landing-footer__oss">
              Código abierto (MIT) ·{" "}
              <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
                github.com/lautaro-temperini/EstoyAi
              </a>{" "}
              · Nacido en Halketon
            </p>
          </div>
          <p className="landing-footer__copy">© {year} EstoyAi</p>
        </div>
      </footer>

      <LandingReveal />
    </>
  );
}
