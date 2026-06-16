import type { FieldReport, Prioridad } from "@/lib/reports/schema";
import { DEFAULT_CAMPOS, type CamposConfig } from "@/lib/reports/campos";

/**
 * Datos de muestra SOLO para desarrollo (NODE_ENV==="development"). Permiten ver
 * /informe/[id], /estado/[id] y el preview con ids mock (m1, r1, …) sin SQLite.
 * Tree-shaken en prod: todo call site gatea con IS_DEV.
 */
export const IS_DEV = process.env.NODE_ENV === "development";

const PRIO_BY_HINT = (id: string): Prioridad =>
  id.includes("1") ? "ALTA" : id.includes("3") ? "BAJA" : "MEDIA";

/** FieldReport de muestra para un id mock. */
export function devFieldReport(id: string): FieldReport {
  const prioridad = PRIO_BY_HINT(id);
  return {
    id,
    transcripcion:
      "Visité a la familia. El nene está con buen peso, doce kilos. La mamá comentó que faltan pañales y que tiene turno con el pediatra la semana que viene.",
    resumen:
      "Visita domiciliaria de seguimiento. Niño con peso adecuado; la familia necesita pañales y tiene control pediátrico pendiente.",
    prioridad,
    motivoCriticidad:
      prioridad === "ALTA" ? "Falta de insumos básicos y control médico pendiente." : "",
    entidades: { nombres: ["Mateo"], fechas: ["próxima semana"] },
    accionesPendientes: ["Gestionar entrega de pañales", "Confirmar turno pediátrico"],
    datos: {
      demografia: { edad: "2 años", fechaNacimiento: "", esMenor: true },
      metricas: { peso: "12 kg", talla: "85 cm", diagnosticos: [], avanceObra: "" },
      socioeconomico: {
        familia: "Familia monoparental, 3 integrantes",
        ingresos: "Changas",
        vivienda: "Alquila una pieza",
        vulnerabilidades: ["Falta de insumos básicos"],
      },
      intervencion: { fecha: "", lugar: "Barrio San Martín", tipoActividad: "Visita domiciliaria" },
      seguimiento: { compromisos: [], situacionLaboral: "", desempenoAcademico: "" },
      narrativa: "La mamá se mostró colaborativa y atenta a las indicaciones.",
    },
    metadatos: {
      tenant: "pequenospasos",
      tipo: "individual",
      beneficiario: { nombre: "Mateo", apellido: "Gómez", dni: "55111222" },
      programa: "primera-infancia",
      profesional: "Ana Rivas",
      sector: null,
      unidad: null,
      capturedAt: Date.now() - 3600_000,
      durationMs: 92_000,
    },
    estado: "PENDIENTE",
    createdAt: Date.now() - 3600_000,
  };
}

/** Respuesta mock de GET /api/informe/[id] (forma que consume /informe/[id]). */
export function devInformeData(id: string): {
  id: string;
  estado: string;
  informe: FieldReport;
  campos: CamposConfig;
  enviado: boolean;
} {
  return { id, estado: "LISTO", informe: devFieldReport(id), campos: DEFAULT_CAMPOS, enviado: false };
}

/** Estado mock para /estado/[id] según el id (r3→error, r2→procesando, resto listo). */
export function devEstado(id: string): { estado: "procesando" | "listo" | "error"; titular: string } {
  const estado = id.includes("3") ? "error" : id.includes("2") ? "procesando" : "listo";
  return { estado, titular: "Gómez Mateo" };
}
