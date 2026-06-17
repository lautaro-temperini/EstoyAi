import type { DatosInforme } from "../schema";
import { buildPpReportContent } from "../content";
import type { Vertical } from "./types";

/**
 * Vertical Pequeños Pasos — la ONG original. Modelo de atención: nutrición,
 * primera infancia, niñez/adolescencia y oficios. Es la vertical por defecto.
 */

/** Empty structured body — every field unknown until the transcript fills it. */
export function emptyDatos(): DatosInforme {
  return {
    demografia: { edad: "", fechaNacimiento: "", esMenor: false },
    metricas: { peso: "", talla: "", diagnosticos: [], avanceObra: "" },
    socioeconomico: { familia: "", ingresos: "", vivienda: "", vulnerabilidades: [] },
    intervencion: { fecha: "", lugar: "", tipoActividad: "" },
    seguimiento: { compromisos: [], situacionLaboral: "", desempenoAcademico: "" },
    narrativa: "",
  };
}

/** Merge a (possibly partial) extracted body over the empty defaults. */
function mergeDatos(d: Partial<DatosInforme> | undefined): DatosInforme {
  const base = emptyDatos();
  if (!d) return base;
  return {
    demografia: { ...base.demografia, ...d.demografia },
    metricas: { ...base.metricas, ...d.metricas },
    socioeconomico: { ...base.socioeconomico, ...d.socioeconomico },
    intervencion: { ...base.intervencion, ...d.intervencion },
    seguimiento: { ...base.seguimiento, ...d.seguimiento },
    narrativa: d.narrativa ?? base.narrativa,
  };
}

export const pequenosPasosVertical: Vertical = {
  id: "pequenospasos",
  orgName: "Pequeños Pasos",
  programas: [
    {
      id: "primera-infancia",
      titulo: "Primera Infancia",
      descripcion: "Niños y niñas de 0 a 5 años",
      icon: "child_care",
    },
    {
      id: "ninez-adolescencia",
      titulo: "Niñez y Adolescencia",
      descripcion: "Chicos y chicas de 6 a 18 años",
      icon: "school",
    },
    {
      id: "oficios",
      titulo: "Oficios",
      descripcion: "Adultos en capacitación laboral",
      icon: "construction",
    },
  ],
  mergeDatos(raw, ctx) {
    const datos = mergeDatos(raw as Partial<DatosInforme> | undefined);
    // Tic de modelos chicos: copiar el resumen entero en narrativa. La narrativa
    // es para detalles cualitativos; duplicada no aporta nada.
    if (datos.narrativa && datos.narrativa.trim() === ctx.resumen.trim()) {
      datos.narrativa = "";
    }
    return datos;
  },
  buildContent: buildPpReportContent,
};
