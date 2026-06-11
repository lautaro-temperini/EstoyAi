# Design System — EstoyAi / Pequeños Pasos

Sistema **Supportive Insight**: PWA de campo legible, calmada y táctil. Fuente de verdad en código: `app-pwa/src/app/globals.css` (Tailwind v4 `@theme`).

La landing pública (`app-pwa/src/app/landing/`) usa estilos **inline independientes** — no comparte este sistema hasta rediseñarse.

---

## Filosofía visual

Herramienta de trabajo en campo, no app de consumo: contraste alto, targets táctiles generosos, jerarquía clara para promotores bajo presión. Paleta azul institucional + verde de progreso; motion sutil y respetuosa de `prefers-reduced-motion`.

---

## Tokens de color

Definidos en `globals.css` como `--color-*` → utilidades Tailwind `bg-*`, `text-*`, `border-*`.

| Rol | Token | Hex |
|---|---|---|
| Primary | `--color-primary` | `#0040a1` |
| On primary | `--color-on-primary` | `#ffffff` |
| Primary container | `--color-primary-container` | `#0056d2` |
| Secondary (éxito/progreso) | `--color-secondary` | `#006c49` |
| Tertiary (acento cálido) | `--color-tertiary` | `#663f00` |
| Error | `--color-error` | `#ba1a1a` |
| Background / surface | `--color-background`, `--color-surface` | `#f8f9ff` |
| On surface | `--color-on-surface` | `#0d1c2e` |
| Outline | `--color-outline` | `#737785` |

Contenedores de surface (`surface-container-*`, `surface-variant`) dan profundidad en cards y paneles sin sombras pesadas.

---

## Tipografía

- **Display / Headlines:** Atkinson Hyperlegible Next — legibilidad en móvil, pesos 600–700.
- **Body / Label / Caption:** Inter — cuerpo 16px base, labels 14px semibold.
- **Iconos:** Material Symbols Outlined (`.material-symbols-outlined`, variante `.fill`).

| Token | Tamaño / line-height | Uso |
|---|---|---|
| `display-lg` | 32px / 40px, 700 | Títulos de pantalla |
| `headline-md` | 24px / 32px, 600 | Secciones |
| `headline-sm` | 20px / 28px, 600 | Subtítulos |
| `body-lg` | 18px / 28px | Texto destacado |
| `body-md` | 16px / 24px | Cuerpo default |
| `label-md` | 14px / 20px, 600 | Botones, labels |
| `caption` | 12px / 16px, 500 | Metadatos, hints |

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

| Clase | Efecto |
|---|---|
| `.anim-enter` | slide-up + fade |
| `.anim-fade` | fade (safe en headers fixed) |
| `.anim-pop` | scale 0.96 → 1 |
| `.stagger` | hijos con delay 40–290ms |
| `.active-tap` | feedback táctil scale(0.98) |
| `.recording-pulse` / `.wave-bar` | grabación activa |

Con `prefers-reduced-motion: reduce` → solo fades; sin pulse/wave.

---

## Componentes definidos

| Componente | Estado | Notas |
|---|---|---|
| Stepper | ✅ | `components/stepper.tsx` — progreso del flujo registro → grabar → estado |
| Brand icons | ✅ | `components/brand-icons.tsx` — SVG tenant |
| Botones / inputs | ✅ | Tailwind + tokens; clases en páginas del flujo |
| Card / surface | ✅ | `bg-surface-container-*`, bordes `outline-variant` |
| Grabación (waveform) | ✅ | `.wave-bar`, `.recording-pulse` en `/grabar` |
| Landing apex | 🔄 | Placeholder inline; pendiente alinear con este sistema |

---

## Decisiones documentadas

- **Atkinson + Inter:** legibilidad en exterior y para usuarios no técnicos; Atkinson en titulares evita confusión O/0.
- **Material Symbols:** set consistente sin bundle de iconos custom; fill para estados activos.
- **Tailwind v4 `@theme`:** un solo archivo de tokens; utilidades generadas automáticamente.
- **Landing desacoplada:** apex es marketing; rediseño con skills en `skills/` sin romper la PWA operativa.
- **Motion Emil Kowalski:** entradas cortas, GPU-only; stagger decorativo, no bloqueante.

---

## Anti-patterns de este sistema

- No usar **MediaRecorder/WebM** en UI de grabación (degrada pipeline ASR — ver [ARCHITECTURE.md](ARCHITECTURE.md)).
- No **scale(0)** en animaciones de layout (rompe percepción de solidez).
- No mezclar **estilos inline** en flujo operativo (`/registro`, `/grabar`, …) — solo en landing hasta unificar.
- No targets táctiles **< 48px** en acciones primarias.
- No ignorar **`prefers-reduced-motion`** al agregar animaciones nuevas.
- No introducir fuentes o colores **fuera de `globals.css`** sin actualizar este documento.

---

## Referencias

- Implementación: `app-pwa/src/app/globals.css`, `app-pwa/src/app/layout.tsx`
- Arquitectura del producto: [ARCHITECTURE.md](ARCHITECTURE.md)
- Skills locales para rediseño: `skills/README.md`
