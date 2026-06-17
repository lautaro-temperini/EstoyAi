import type { TriageItem } from "@/lib/reports/triage";

/**
 * Datos de muestra SOLO para desarrollo (NODE_ENV==="development"). Permite ver
 * la UI y los filtros del tablero sin SQLite con datos. No entra al build de
 * producción: la página solo los usa cuando no hay informes y estamos en dev.
 */
const DAY = 86_400_000;
const now = Date.now();

const b = (nombre: string, apellido: string, dni: string) => ({ nombre, apellido, dni });

const PP_MOCK_ITEMS: TriageItem[] = [
  {
    id: "m1", estado: "LISTO", categoria: "ALTA", prioridad: "ALTA",
    motivoCriticidad: "Signos de violencia intrafamiliar; requiere intervención inmediata.",
    resumen: "Visita domiciliaria con indicadores de riesgo.",
    beneficiario: b("Mateo", "Gómez", "55111222"), programa: "ninez-adolescencia",
    profesional: "Ana Rivas", accionesPendientes: ["Contactar a trabajo social", "Derivar a guardia"],
    createdAt: now - 1 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "m2", estado: "LISTO", categoria: "ALTA", prioridad: "ALTA",
    motivoCriticidad: "Desnutrición aguda en menor de 2 años.",
    resumen: "Control nutricional con bajo peso severo.",
    beneficiario: b("Sofía", "Pérez", "55333444"), programa: "primera-infancia",
    profesional: "Ana Rivas", accionesPendientes: ["Turno pediátrico urgente"],
    createdAt: now - 3 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "m3", estado: "LISTO", categoria: "MEDIA", prioridad: "MEDIA",
    motivoCriticidad: "Falta de insumos del comedor esta semana.",
    resumen: "Entrega de bolsón incompleta.",
    beneficiario: b("Lucía", "Gómez", "55555666"), programa: "primera-infancia",
    profesional: "Carlos Díaz", accionesPendientes: ["Reponer leche fórmula"],
    createdAt: now - 1 * DAY, tieneDocx: true, error: null,
  },
  {
    id: "m4", estado: "LISTO", categoria: "MEDIA", prioridad: "MEDIA",
    motivoCriticidad: "Pago de microcrédito atrasado.",
    resumen: "Seguimiento laboral en taller de oficios.",
    beneficiario: b("Jorge", "Sosa", "55777888"), programa: "oficios",
    profesional: "Carlos Díaz", accionesPendientes: [],
    createdAt: now - 1 * DAY - 2 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "m5", estado: "LISTO", categoria: "BAJA", prioridad: "BAJA",
    motivoCriticidad: "",
    resumen: "Registro informativo de taller de apoyo escolar.",
    beneficiario: b("Mateo", "Gómez", "55111222"), programa: "ninez-adolescencia",
    profesional: "Ana Rivas", accionesPendientes: [],
    createdAt: now - 2 * DAY, tieneDocx: true, error: null,
  },
  {
    id: "m6", estado: "LISTO", categoria: "BAJA", prioridad: "BAJA",
    motivoCriticidad: "",
    resumen: "Reparación menor de equipamiento no esencial.",
    beneficiario: b("Valentina", "Luna", "55999000"), programa: "oficios",
    profesional: "Carlos Díaz", accionesPendientes: [],
    createdAt: now - 3 * DAY, tieneDocx: true, error: null,
  },
  {
    id: "m7", estado: "ERROR", categoria: "error", prioridad: null,
    motivoCriticidad: "", resumen: "",
    beneficiario: b("Diego", "Fernández", "55101010"), programa: "oficios",
    profesional: "Ana Rivas", accionesPendientes: [],
    createdAt: now - 30 * 60_000, tieneDocx: false,
    error: "Whisper timeout: transcripción falló (HTTP 504)",
  },
  {
    id: "m8", estado: "RECIBIDO", categoria: "proceso", prioridad: null,
    motivoCriticidad: "", resumen: "",
    beneficiario: b("Camila", "Ríos", "55202020"), programa: "primera-infancia",
    profesional: "Carlos Díaz", accionesPendientes: [],
    createdAt: now - 5 * 60_000, tieneDocx: false, error: null,
  },
];

const DTC_MOCK_ITEMS: TriageItem[] = [
  {
    id: "d1", estado: "LISTO", categoria: "ALTA", prioridad: "ALTA",
    motivoCriticidad: "Consumo problemático de pasta base, sin red vincular activa.",
    resumen: "Primer contacto espontáneo. Solicita orientación para tratamiento.",
    beneficiario: b("Rodrigo", "Villalba", "38200100"), programa: "hpc",
    profesional: "Fernanda Morales", accionesPendientes: ["Derivar a CPA", "Contactar referente familiar"],
    createdAt: now - 2 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "d2", estado: "LISTO", categoria: "ALTA", prioridad: "ALTA",
    motivoCriticidad: "Recaída tras alta hospitalaria. Sin contención familiar.",
    resumen: "Seguimiento mensual. Requiere refuerzo de estrategia.",
    beneficiario: b("Miriam", "Suárez", "40555666"), programa: "seguimiento",
    profesional: "Fernanda Morales", accionesPendientes: ["Coordinar con equipo de salud", "Planificar visita domiciliaria"],
    createdAt: now - 5 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "d3", estado: "LISTO", categoria: "MEDIA", prioridad: "MEDIA",
    motivoCriticidad: "Baja adherencia al taller de habilidades sociales.",
    resumen: "Taller grupal semanal. Participación irregular.",
    beneficiario: b("Lucas", "Herrera", "41888999"), programa: "taller",
    profesional: "Diego Romero", accionesPendientes: ["Reforzar convocatoria"],
    createdAt: now - 1 * DAY, tieneDocx: true, error: null,
  },
  {
    id: "d4", estado: "LISTO", categoria: "MEDIA", prioridad: "MEDIA",
    motivoCriticidad: "",
    resumen: "Evolución positiva. Mantiene vínculo con DTC.",
    beneficiario: b("Natalia", "Castro", "39777888"), programa: "seguimiento",
    profesional: "Diego Romero", accionesPendientes: [],
    createdAt: now - 1 * DAY - 3 * 3600_000, tieneDocx: true, error: null,
  },
  {
    id: "d5", estado: "LISTO", categoria: "BAJA", prioridad: "BAJA",
    motivoCriticidad: "",
    resumen: "Taller de oficios. Sin situación de riesgo identificada.",
    beneficiario: b("Pablo", "González", "42100200"), programa: "taller",
    profesional: "Diego Romero", accionesPendientes: [],
    createdAt: now - 2 * DAY, tieneDocx: true, error: null,
  },
  {
    id: "d6", estado: "ERROR", categoria: "error", prioridad: null,
    motivoCriticidad: "", resumen: "",
    beneficiario: b("Verónica", "Ríos", "43300400"), programa: "hpc",
    profesional: "Fernanda Morales", accionesPendientes: [],
    createdAt: now - 45 * 60_000, tieneDocx: false,
    error: "Whisper timeout: transcripción falló (HTTP 504)",
  },
];

export const MOCK_BY_TENANT: Record<string, TriageItem[]> = {
  dtcvillatranquila: DTC_MOCK_ITEMS,
};

export const MOCK_ITEMS: TriageItem[] = PP_MOCK_ITEMS;
