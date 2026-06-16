# Design System — EstoyAi / Pequeños Pasos

Sistema **Supportive Insight**: PWA de campo legible, calmada y táctil. Fuente de verdad en código: `app-pwa/src/app/globals.css` (Tailwind v4 `@theme`).

La landing pública (`app-pwa/src/app/landing/`) tiene **design system propio** documentado en [Landing pública](#landing-pública). Comparte paleta con la PWA pero implementación aislada en `landing.css`.

---

## Filosofía visual

Herramienta de trabajo en campo, no app de consumo: contraste alto, targets táctiles generosos, jerarquía clara para promotores bajo presión. Paleta azul institucional + verde de progreso; motion sutil y respetuosa de `prefers-reduced-motion`.

---

## Tokens de color

Definidos en `globals.css` como `--color-*` → utilidades Tailwind `bg-*`, `text-*`, `border-*`.

| Rol                        | Token                                   | Hex       |
| -------------------------- | --------------------------------------- | --------- |
| Primary                    | `--color-primary`                       | `#0040a1` |
| On primary                 | `--color-on-primary`                    | `#ffffff` |
| Primary container          | `--color-primary-container`             | `#0056d2` |
| Secondary (éxito/progreso) | `--color-secondary`                     | `#006c49` |
| Tertiary (acento cálido)   | `--color-tertiary`                      | `#663f00` |
| Error                      | `--color-error`                         | `#ba1a1a` |
| Background / surface       | `--color-background`, `--color-surface` | `#f8f9ff` |
| On surface                 | `--color-on-surface`                    | `#0d1c2e` |
| Outline                    | `--color-outline`                       | `#737785` |

Contenedores de surface (`surface-container-*`, `surface-variant`) dan profundidad en cards y paneles sin sombras pesadas.

---

## Chips de estado

Fuente de verdad en código: `app-pwa/src/components/status-chip.tsx` (`StatusChip`, `ESTADO_CHIP`). Un solo componente para todos los chips de severidad y de procesamiento — no duplicar mapas de label/color por pantalla.

Casing: capitalizado normal en estados de procesamiento (En cola, Procesando, Listo, Error). **Excepción: severidad** (`alta`/`media`/`baja`) va en MAYÚSCULA como énfasis de triage.

Paleta Tailwind por defecto (no son tokens custom de `globals.css`; conviven con la paleta de marca solo para este componente):

| Estado       | Label       | Clases                       |
| ------------ | ----------- | ----------------------------- |
| `alta`       | ALTA        | `bg-pink-100 text-pink-700`   |
| `media`      | MEDIA       | `bg-orange-100 text-orange-700` |
| `baja`       | BAJA        | `bg-yellow-100 text-yellow-800` |
| `en-cola`     | En cola                | `bg-gray-100 text-gray-600`       |
| `procesando`  | Procesando             | `bg-cyan-100 text-cyan-700`       |
| `por-revisar` | Listo para revisar     | `bg-green-100 text-green-700`     |
| `enviado`     | Enviado a coordinación | `bg-emerald-100 text-emerald-700` |
| `error`       | Error                  | `bg-red-100 text-red-700`         |

Cada pantalla mapea su propio enum (`TriageCategoria`, `RegistroEstado`) a uno de estos 8 estados; `StatusChip` no conoce esos enums, solo el estado estandarizado.

**Prioridad usa SIEMPRE `StatusChip`** (`alta`/`media`/`baja`) — no definir tablas de color de prioridad por pantalla. El selector de prioridad en `/informe` reusa `ESTADO_CHIP[...].cls` y `.label` para el estado activo.

---

## Chips de filtro

Pills de filtro (criticidad, programa) en `/tablero`. Distinto de los chips de estado: comunican **selección**, no severidad.

- **Seleccionado:** `bg-primary text-on-primary` (azul institucional). Un único color de selección en toda la app — el verde (`secondary`) está reservado a "éxito / se queda en la sede", nunca a selección.
- **No seleccionado:** `bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high`.
- Forma: `rounded-full px-3 py-1.5 font-label-md`. Contador opcional al lado del label.

---

## Acciones de card

Layout de card en `/registros` y `/tablero`:

- **Cuerpo navegable** (`flex-grow`, área clickeable → preview/estado): primera fila `flex items-start justify-between gap-2` con **título** (`truncate`) a la izquierda y **`StatusChip`** a la derecha (el título trunca, el chip no rompe línea). Debajo: metadatos (`font-caption`), y en `/tablero` el motivo de criticidad + acciones pendientes, todo en `font-caption` (jerarquía: el título es lo único en `label-md`).
- **Borrar** (destructiva): botón **al costado**, `shrink-0 px-4 border-l border-outline-variant hover:bg-error-container text-error`, ícono 20px, alto completo de la card. Confirmación en modal. En `/tablero` solo visible para admin.
- **Acción contextual puntual** (ej. "Reintentar" en error): barra inferior `border-t … px-2 py-1.5`, solo cuando aplica.
- **Descargar `.docx`** vive en el preview (arriba a la derecha), no en la card.
- R2/Podio: endpoints abiertos en el código pero **fuera de la UI** por ahora.

---

## Tipografía

- **Display / Headlines:** Atkinson Hyperlegible Next — legibilidad en móvil, pesos 600–700.
- **Body / Label / Caption:** Inter — cuerpo 16px base, labels 14px semibold.
- **Iconos:** Material Symbols Outlined (`.material-symbols-outlined`, variante `.fill`).

| Token         | Tamaño / line-height | Uso                 |
| ------------- | -------------------- | ------------------- |
| `display-lg`  | 32px / 40px, 700     | Títulos de pantalla |
| `headline-md` | 24px / 32px, 600     | Secciones           |
| `headline-sm` | 20px / 28px, 600     | Subtítulos          |
| `body-lg`     | 18px / 28px          | Texto destacado     |
| `body-md`     | 16px / 24px          | Cuerpo default      |
| `label-md`    | 14px / 20px, 600     | Botones, labels     |
| `caption`     | 12px / 16px, 500     | Metadatos, hints    |

---

## Espaciado

- **Base:** 8px (`--spacing-unit`)
- **Stack:** sm 8px · md 16px · lg 24px
- **Gutter / container margin:** 16px / 20px
- **Touch target mínimo:** 48px (`--spacing-touch-target-min`)
- **Radius:** lg 0.5rem · xl 0.75rem

Escala práctica en layouts: 4 / 8 / 12 / 16 / 24 / 32 / 48 px (vía Tailwind + tokens custom).

---

## Motion

Curvas: `--ease-out`, `--ease-in-out`. Entradas ≤ 300ms; solo `transform`/`opacity`.

| Clase                            | Efecto                       |
| -------------------------------- | ---------------------------- |
| `.anim-enter`                    | slide-up + fade              |
| `.anim-fade`                     | fade (safe en headers fixed) |
| `.anim-pop`                      | scale 0.96 → 1               |
| `.stagger`                       | hijos con delay 40–290ms     |
| `.active-tap`                    | feedback táctil scale(0.98)  |
| `.recording-pulse` / `.wave-bar` | grabación activa             |

Con `prefers-reduced-motion: reduce` → solo fades; sin pulse/wave.

---

## Componentes definidos

| Componente           | Estado | Notas                                                                    |
| -------------------- | ------ | ------------------------------------------------------------------------ |
| Stepper              | ✅      | `components/stepper.tsx` — progreso del flujo registro → grabar → estado |
| Brand icons          | ✅      | `components/brand-icons.tsx` — SVG tenant                                |
| Botones / inputs     | ✅      | Tailwind + tokens; clases en páginas del flujo                           |
| Card / surface       | ✅      | `bg-surface-container-*`, bordes `outline-variant`                       |
| Grabación (waveform) | ✅      | `.wave-bar`, `.recording-pulse` en `/grabar`                             |
| Landing pública      | ✅      | `app-pwa/src/app/landing/` — ver [Landing pública](#landing-pública)     |

---

## Decisiones documentadas

- **Atkinson + Inter:** legibilidad en exterior y para usuarios no técnicos; Atkinson en titulares evita confusión O/0.
- **Material Symbols:** set consistente sin bundle de iconos custom; fill para estados activos.
- **Tailwind v4 `@theme`:** un solo archivo de tokens; utilidades generadas automáticamente.
- **Landing desacoplada:** marketing en `landing.css`; misma paleta, sin Tailwind ni `globals.css`, para no acoplar la PWA operativa.
- **Motion Emil Kowalski:** entradas cortas, GPU-only; stagger decorativo, no bloqueante.

---

## Anti-patterns de este sistema

- No usar **MediaRecorder/WebM** en UI de grabación (degrada pipeline ASR — ver [ARCHITECTURE.md](ARCHITECTURE.md)).
- No **scale(0)** en animaciones de layout (rompe percepción de solidez).
- No mezclar **`landing.css`** en flujo operativo (`/registro`, `/grabar`, …) ni importar tokens de `globals.css` en la landing sin actualizar ambas secciones de este doc.
- No targets táctiles **< 48px** en acciones primarias.
- No ignorar **`prefers-reduced-motion`** al agregar animaciones nuevas.
- No introducir fuentes o colores **fuera de `globals.css`** sin actualizar este documento.

---

## Landing pública

Ruta: `/landing` (apex `estoyai.com`). Objetivo: **adopción** — que otras ONGs contacten para usar EstoyAi (gratis, open source). CTA principal = `mailto` de contacto; secundario = GitHub. Copy desde `docs/brief.md`.

### Archivos

| Archivo                               | Rol                                                   |
| ------------------------------------- | ----------------------------------------------------- |
| `app-pwa/src/app/landing/page.tsx`    | Contenido, SVG inline (logo, diagrama, iconos)        |
| `app-pwa/src/app/landing/layout.tsx`  | Metadata SEO/OG, fuente Inter (`--font-landing-body`) |
| `app-pwa/src/app/landing/landing.css` | Tokens y componentes bajo scope `.landing`            |

No usa Tailwind ni `globals.css`. Todos los estilos viven en `landing.css` con prefijo de clase `landing-*`.

### Dirección visual

**Civic utilitario** (estilo «Accessible & Ethical») **sobre los tokens de «Supportive Insight»**: la PWA y la landing comparten radios, bordes suaves, curva de motion y microinteracciones. Servicio público hecho impecable: confianza por **claridad**, no por decoración. Grilla suiza, **alto contraste** (AAA), tipografía masiva, estructura por **reglas hairline** (`outline-variant`, no negras). Fondo papel (`#f8f9ff`), azul institucional dominante, verde como **único acento** (señal «se queda en la sede»).

Casing: **igual que la webapp** — los labels NO usan `text-transform: uppercase`; la jerarquía va por peso (600) y color (`muted`/`ink`). Reservado mayúsculas: ninguna palabra en caja alta completa.

Evitar explícitamente:

- Decoración / adorno (gradientes, sombras blandas, grano, grilla de fondo)
- **Mayúsculas totales** en labels (rompe coherencia con la PWA)
- Bajo contraste y tipografía tímida
- Dark + verde ácido (startup) · cream + serif (ONG genérica)

**Elemento firma:** índice numerado `01 / 02 / 03` a ancho completo, numerales Atkinson gigantes, filas separadas por hairlines (`.landing-index`). **Firma secundaria:** schematic horizontal Campo → Sede → .docx con pulso en el path (`FlowSchematic`, nodos rectangulares).

**Narrativa de secciones** (11 elementos del framework de landing, adaptados a adopción de ONG — no venta SaaS): header (logo + nav + CTA) → hero (título masivo + CTA primario/ghost + social proof: 13 ONGs / 90% / en producción) → **01** problema (3 dolores) → **02** cómo funciona (índice 3 pasos + schematic) → **03** por qué es diferente (7 diferenciales del brief) → soberanía (spotlight oscuro) → **04** caso Pequeños Pasos (social proof real) → **05** para quién + exclusiones → **06** FAQ (accordion `<details>`) → CTA final (bloque ink full-bleed) → footer (contacto, OSS, origen Halketon).

Testimonios (elemento 8 del framework): **no se inventan citas**; el caso real Pequeños Pasos cumple esa función. Si hay una cita verificada de la organización, va en ese bloque.

### Tokens (scope `.landing`)

Definidos al inicio de `landing.css`. Hex de marca compartidos con la PWA, **reasignados a roles civic** (nombres semánticos por función, no por escala Material).

| Rol                          | Variable        | Valor / notas                                  |
| ---------------------------- | --------------- | ---------------------------------------------- |
| Azul institucional (bloques) | `--ink`         | `#0040a1`                                       |
| Azul links / markers / hover | `--ink-bright`  | `#0056d2`                                       |
| Tinta (texto + bloque osc.)  | `--ink-deep`    | `#0d1c2e`                                       |
| Verde — único acento         | `--green`       | `#006c49` (señal «se queda en la sede»)         |
| Fondo papel                  | `--paper`       | `#f8f9ff`                                       |
| Banda alterna                | `--paper-2`     | `#eef1fb` (footer)                              |
| Texto secundario             | `--muted`           | `#424654` (= on-surface-variant de la PWA)  |
| Reglas / bordes suaves       | `--outline-variant` | `#c3c6d6`                                    |
| Borde acento                 | `--outline`         | `#737785`                                    |
| Surface (paneles)            | `--surface`         | `#ffffff` (surface-container-lowest)         |
| Fill suave / hover           | `--surface-low`     | `#eff4ff` (surface-container-low)            |
| Banda footer                 | `--surface-band`    | `#e6eeff` (surface-container)                |
| Sobre tinta                  | `--on-ink`          | `#ffffff`                                    |

Radios `--radius-lg 0.5rem` / `--radius-xl 0.75rem` (idénticos a `globals.css`). **Sin sombras**: la jerarquía es estructural (reglas suaves + radios + tipo), no por elevación.

### Tipografía

| Uso             | Fuente                             | Carga                                               |
| --------------- | ---------------------------------- | --------------------------------------------------- |
| Display / h1–h3 | Atkinson Hyperlegible Next 600–700 | Google Fonts en `landing.css`                       |
| Body            | Inter 400–500–600                  | `next/font` en `layout.tsx` → `--font-landing-body` |

| Clase / elemento        | Tamaño                                  | Uso                              |
| ----------------------- | --------------------------------------- | -------------------------------- |
| `.landing-hero__title`  | `clamp(2.75rem, 8.5vw, 5.5rem)`, ls −0.045em | H1 masivo, 2–3 palabras por línea |
| `.landing-index__num`   | `clamp(2.5rem, 7vw, 4.5rem)`, tabular   | Numerales índice 01/02/03 (firma) |
| `.landing__h2`          | `clamp(1.875rem, 4.5vw, 3rem)`          | H2 de sección                    |
| `.landing-stat__value`  | `clamp(1.75rem, 4vw, 2.5rem)`, tabular  | Métricas del panel hero          |
| `.landing__lead`        | `clamp(1.0625rem, 1.6vw, 1.1875rem)`    | Lead / párrafo destacado         |
| `.landing__eyebrow`     | `0.875rem`, caja normal, peso 600       | Eyebrow + número de sección      |
| Cuerpo base             | `1.0625rem` / 1.6                       | Default bajo `.landing`          |

Titulares: `letter-spacing: -0.025em` a `-0.04em`, peso 700, line-height 0.98–1.08. Números siempre `font-variant-numeric: tabular-nums`. **Labels en caja normal** (peso + color), nunca uppercase.

### Espaciado y layout

| Token                     | Valor                            |
| ------------------------- | -------------------------------- |
| `--space-1` … `--space-7` | 0.5rem → 6rem (escala 8px-base)  |
| `--max-width`             | `76rem`                          |
| `--gutter`                | `clamp(1.25rem, 4vw, 1.75rem)`   |
| `--touch-min`             | `48px` (links / targets)         |

**Radios** `--radius-lg 0.5rem` / `--radius-xl 0.75rem` (= PWA) en paneles, celdas, chips, cajas de icono.

**Contenedor:** `.landing__container` — centrado, max-width, gutter.

**Ritmo vertical de secciones** (`main > section`):

- Cada `.landing__section` separada por `border-top: 1px solid var(--outline-variant)` — la **regla suave** marca el corte, no el color de fondo.
- `.landing-sov`: bloque oscuro full-bleed (`--ink-deep`), texto blanco.
- Footer: banda `--surface-band`.

**Breakpoints habituales:** 40rem (header meta, footer row), 44rem (compare 2 col), 52rem (audiencia 3 col), 56rem (soberanía 2 col), 60rem (hero 2 col).

### Elevación y superficies

**Sin sombras** — jerarquía estructural con bordes suaves y radios (igual estrategia que los paneles planos de la PWA):

- **Reglas** — `1px solid var(--outline-variant)` entre secciones y filas (índice, audiencia, compare, stats).
- **Bloques** — paneles `border: 1px solid var(--outline-variant)` + `border-radius` + fondo `--surface` (claro) o `--ink-deep` (oscuro). Cero `box-shadow`.
- **Microinteracciones** (alineadas a `globals.css`): `.active-tap` `scale(0.98)` en links/logo; hover en `.landing-aud__cell` → `border-color` + `background` (transición 280ms, sin transform); focus rings 2px.

### Motion

| Elemento              | Comportamiento                                               |
| --------------------- | ------------------------------------------------------------ |
| `.landing-anim --1/4` | Entrada `enter-up` + `translateY(10px)`, delays 60–270ms     |
| `.landing-rule`       | `landing-draw` 600ms — la regla se dibuja 0 → 100% (scaleX)  |
| `.landing-flow__pulse`| `landing-travel` 3.6s — dash viaja Campo → Sede → .docx      |

Curva: `cubic-bezier(0.23, 1, 0.32, 1)` y duración `280ms` — **las mismas de `globals.css`** (Emil Kowalski). Con `prefers-reduced-motion: reduce`: sin entradas, reglas ya dibujadas (`scaleX(1)`), pulse estático, hover sin transición.

Sin gradientes, grano ni grilla de fondo — el civic no decora el fondo.

### Secciones y componentes

| Bloque         | Clases principales                       | Notas                                                       |
| -------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Header         | `.landing-header`, `.landing-header__nav` | Blur 12px, rule-bottom; nav + CTA `Adoptalo` ≥52rem; logo `.active-tap` |
| Botones / CTA  | `.landing-btn` + `--primary`/`--ghost`/`--on-dark`/`--ghost-on-dark` | Radius-lg, target 48px, `.active-tap`; variantes invertidas para bloques oscuros |
| Hero           | `.landing-hero`, `.landing-hero__panel`, `.landing-hero__proof` | Título masivo + CTAs + social proof (stats Atkinson) + panel + schematic |
| Schematic firma| `.landing-flow`, `.landing-flow__*`      | SVG 360×96; nodos redondeados Campo / Sede / .docx          |
| Problema       | `.landing-problem__*`                     | 3 celdas, `border-top` tertiary (acento cálido del dolor)   |
| Índice (firma) | `.landing-index`, `.landing-index__num`  | Filas 01/02/03 ancho completo, numerales gigantes, hairlines |
| Por qué (benefits)| `.landing-why__*`                     | Grid 1→2→3 col; 7 diferenciales con icono; hover en celda   |
| Soberanía      | `.landing-sov`, `.landing-guarantee`     | Bloque oscuro spotlight; garantías en cajas; `.landing-sov__boundary` |
| Caso de estudio| `.landing-case__*`, `.landing-compare`   | Status «Activo hoy»; programas en chips; Antes/Ahora en filas |
| Audiencia      | `.landing-aud`, `.landing-notfor`        | Celdas en grid bordeado; exclusiones en lista con guiones   |
| FAQ            | `.landing-faq__*`                         | `<details>/<summary>` nativo (sin JS); chevron `expand_more` rota |
| CTA final      | `.landing-final__*`                       | Bloque `--ink` full-bleed; CTAs invertidos; max 44rem       |
| Footer         | `.landing-footer`                        | Email, GitHub MIT, origen Halketon, copyright              |

Eyebrow de sección: `.landing__eyebrow` con `data-index="0N"` — el número (Atkinson) precede al label. Iconos: SVG stroke inline en `page.tsx` (no Material Symbols).

### Relación con la PWA operativa

| Aspecto            | PWA (`globals.css`)         | Landing (`landing.css`)                 |
| ------------------ | --------------------------- | --------------------------------------- |
| Implementación     | Tailwind v4 `@theme`        | CSS vanilla scoped                      |
| Tipografía display | Atkinson (root layout)      | Atkinson (CDN en landing)               |
| Objetivo UX        | Táctil, flujo bajo presión  | Lectura, confianza institucional        |
| Animaciones        | `.anim-enter`, stagger, tap | `.landing-anim`, reglas dibujadas, pulse SVG |
| Iconos             | Material Symbols (root layout) | Material Symbols (landing/layout.tsx) |
| Elevación          | Sombras suaves              | Ninguna — reglas hairline + bordes      |

Al cambiar un hex de marca, actualizar **ambos** archivos de tokens y esta sección.

### Anti-patterns (landing)

- No **inventar testimonios/citas** — solo proof real (caso Pequeños Pasos). El objetivo es adopción honesta, no marketing inflado.
- No importar **Tailwind/utilidades PWA ni ShadCN** en `page.tsx` de landing — el aislamiento en `landing.css` (CSS vanilla scoped) es deliberado; el framework de landing-page se adapta a este sistema, no al revés.
- No desviar el **copy del brief** (`docs/brief.md`) — es la fuente de verdad de claims (gratis, OSS, offline, hardware, datos, adaptable, instalable).
- No reemplazar **Material Symbols** por SVG inline custom — la font ya carga en `landing/layout.tsx`, mismos iconos que la PWA.
- No **unificar con `globals.css`** sin plan explícito: el aislamiento protege la PWA.
- No agregar **sombras, gradientes ni grano** — la jerarquía va por reglas suaves, radios y tipo. (Radios sí: `--radius-lg/xl`, alineados a la PWA.)
- No usar **mayúsculas totales** en labels — caja normal con peso 600 + color, como la webapp.
- No usar **bordes negros / `outline-variant` reemplazado por tinta** — las reglas son suaves (`#c3c6d6`).
- No usar el **verde como decoración** — es señal exclusiva de «se queda en la sede» (paso final, status, acentos de privacidad).
- No animaciones de **layout pesado** (solo opacity/transform en entradas, scaleX en reglas, dash en pulse) ni curvas distintas a `--ease-out`.
- No olvidar **`prefers-reduced-motion`** al tocar motion.

---

## Referencias

- PWA: `app-pwa/src/app/globals.css`, `app-pwa/src/app/layout.tsx`
- Landing: `app-pwa/src/app/landing/landing.css`, `app-pwa/src/app/landing/page.tsx`
- Arquitectura del producto: [ARCHITECTURE.md](ARCHITECTURE.md)
- Skills locales para rediseño: `skills/README.md`
