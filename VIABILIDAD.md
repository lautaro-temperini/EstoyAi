# DESIGN-analitica.md — Análisis de patrones (validación de viabilidad)

Documento de evaluación, **no de implementación**. Responde a la pregunta del director
sobre "análisis de patrones" y valida la hipótesis de que ninguna de las necesidades
requiere un LLM más grande que el `gemma3:4b` ya disponible.

Estado: borrador de validación. Pendiente de definiciones del director (ver última sección).

---

## Veredicto

**La hipótesis es correcta.** Ninguna de las cinco necesidades requiere un modelo más
grande. Todas son **cálculo determinístico sobre datos ya capturados**:

- Cobertura y asistencia → aritmética (`COUNT` / `SUM`).
- Rango nutricional OMS → fórmula cerrada (método LMS → z-score) contra tabla estática.
- Informes → agregación SQL + plantilla.

El LLM grande no aporta a ninguna. **El cuello de botella no es el modelo ni el cómputo
(trivial en 8GB sin GPU), sino la estructura del dato.**

---

## Estado actual del dato (verificado en código)

- SQLite guarda **dos blobs JSON** por registro: `metadata` y `informe_json`
  (`lib/db/sqlite.ts`). No hay columnas relacionales para las métricas.
- `peso`, `talla`, `edad` son **strings libres** (`"12 kg"`, `"3 años"`) — `schema.ts`.
- **No se captura `sexo`.** `demografia = { nombre, edad, fechaNacimiento, esMenor }`.
- **No hay modelo de asistencia.** Cada registro es una nota de voz, no un evento de
  asistencia. Las ausencias solo aparecen como texto en la narrativa.
- **No hay denominadores de cohorte** (vacancia total, padrón de inscriptos).

---

## Los 4 huecos reales (todos de modelado, ninguno de IA)

| # | Hueco | Resuelto en | Esfuerzo |
|---|---|---|---|
| 1 | `peso`/`talla`/`edad` son texto libre → normalizar a número + unidad | Pipeline de extracción (ya corre) | Bajo |
| 2 | Falta `sexo` (OMS lo exige: tablas por edad **y** sexo) | Form de captura + `schema.ts` | Bajo |
| 3 | No hay asistencia estructurada (numerador/denominador) | Decisión de producto + modelo nuevo | **Alto** |
| 4 | No hay denominadores de cohorte (vacancia/padrón) | Tabla de referencia/config | Medio |

Huecos 1–2: se resuelven ampliando lo que ya funciona.
Huecos 3–4: requieren definiciones del director antes de diseñar.

---

## Enfoque por necesidad (sin LLM grande)

1. **Cobertura del programa** — `asistidos / vacancia_total`. Necesita tabla
   `cohortes(programa, sede, vacancia, inscriptos)`. SQL puro. (Hueco 4)

2. **Asistencia >90%** — `SUM(presente) / COUNT(*)` por beneficiario/periodo.
   **Bloqueado por hueco 3**: hay que definir el origen del dato de asistencia.
   Es el de mayor esfuerzo de modelado.

3. **Seguimiento nutricional OMS** — embeber las tablas OMS (parámetros LMS como
   archivos de datos estáticos, on-prem) y calcular z-score con la fórmula LMS.
   Matemática pura: sin modelo, sin API. Depende de huecos 1 y 2.

4. **Informe mensual a financiadores** — vista SQL agregada y **anonimizada** +
   plantilla determinística (auditable, apta para compliance). El LLM (gemma3:4b)
   solo suaviza la prosa cualitativa, con revisión humana. Reemplaza el trabajo
   manual del abogado.

5. **Informe individual de evolución** — serie temporal por beneficiario
   (peso/talla y trayectoria de z-score en el tiempo) → tabla/gráfico + plantilla.
   LLM opcional para la narrativa.

---

## Arquitectura propuesta

Una **capa analítica nueva, separada del pipeline de extracción**:

```
SQLite (informe_json / metadata)
  → normalización (parseo numérico de peso/talla/edad)
  → agregación SQL + lookup OMS (LMS → z-score)
  → render (plantilla; LLM opcional para narrativa)
```

Decisión previa recomendada: **proyectar los campos numéricos a columnas/tabla
relacional** (o `json_extract` con índices) para que el agregado sea ágil.

El rol del LLM se **achica**: (a) extracción estructurada —ya corre, solo ampliar— y
(b) narrativa opcional desde plantilla. Ambas dentro de gemma3:4b.

---

## Restricciones — todas compatibles

- On-premises, sin APIs externas: ✓ (OMS son tablas estáticas, no un servicio).
- 8GB RAM, sin GPU: ✓ (SQL y z-score son despreciables; gemma3:4b ya corre).
- Sin modelos más grandes: ✓ (no se necesitan).

---

## Preguntas para el director (definen huecos 3 y 4)

**Asistencia (hueco 3) — el más grande:**
- ¿Hoy se registra la asistencia en algún lado (planilla, otro sistema)? ¿O no existe?
- Si existe, ¿se puede importar? ¿En qué formato/granularidad (por sesión, por día)?
- Si no existe, ¿se acepta diseñar una captura nueva (check-in por sesión) o se
  acepta inferirla —con menor precisión— de las notas de voz existentes?
- ¿"Asistencia >90%" es por beneficiario, por cohorte, mensual?

**Cobertura (hueco 4):**
- ¿De dónde sale "vacancia total" y el padrón de inscriptos? ¿Quién lo mantiene?
- ¿Es por sede, por programa, ambos?

**Informe a financiadores:**
- ¿Hay un formato/plantilla que ya exige el financiador?
- ¿Qué métricas son obligatorias vs deseables?
- ¿Qué nivel de anonimización exige el compliance (agregados sin nombres, k-anonymity)?

**Nutrición:**
- ¿Se usa el estándar OMS o tablas nacionales (ej. SAP en Argentina)?
- ¿Qué índices? (peso/edad, talla/edad, peso/talla, IMC/edad)

---

## Próximo paso sugerido

Con las respuestas del director, el primer entregable de menor riesgo y mayor valor
clínico autocontenido es **Nutrición OMS** (depende solo de ampliar el pipeline
existente: normalización numérica + campo sexo + tablas LMS). Los huecos 3 y 4
(asistencia y cobertura) requieren definiciones antes de estimar.
