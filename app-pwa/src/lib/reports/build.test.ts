import { describe, it, expect } from "vitest";
import { buildReport } from "./build";
import type { ReportExtraction, ReportMetadata } from "./schema";

const META: ReportMetadata = {
  tenant: null,
  tipo: null,
  beneficiario: null,
  programa: null,
  profesional: null,
  sector: null,
  unidad: null,
  capturedAt: 0,
  durationMs: null,
};

// El LLM puede mandar cualquier cosa; buildReport debe normalizar sin romper.
function ext(over: Record<string, unknown> = {}): ReportExtraction {
  return over as unknown as ReportExtraction;
}

describe("buildReport — normalización del envelope", () => {
  it("prioridad inválida → MEDIA; minúsculas → mayúsculas del enum", () => {
    expect(buildReport("t", ext({ prioridad: "URGENTE" }), META).prioridad).toBe("MEDIA");
    expect(buildReport("t", ext({ prioridad: "alta" }), META).prioridad).toBe("ALTA");
    expect(buildReport("t", ext({}), META).prioridad).toBe("MEDIA");
  });

  it("campos de lista que no son arrays → []", () => {
    const r = buildReport("t", ext({ accionesPendientes: "no es array", entidades: { nombres: 5 } }), META);
    expect(r.accionesPendientes).toEqual([]);
    expect(r.entidades.nombres).toEqual([]);
  });

  it("limpia placeholders típicos de modelos chicos", () => {
    const r = buildReport("t", ext({ accionesPendientes: ["[No especificada]", "Visitar el martes", "N/A"] }), META);
    expect(r.accionesPendientes).toEqual(["Visitar el martes"]);
  });

  it("limpia el literal '{Fecha del registro}' y la forma verbal 'No especifica'", () => {
    const r = buildReport(
      "t",
      ext({ accionesPendientes: ["{Fecha del registro}", "No especifica", "Llamar a la escuela"] }),
      META,
    );
    expect(r.accionesPendientes).toEqual(["Llamar a la escuela"]);
  });

  it("resumen vacío cae a la transcripción", () => {
    expect(buildReport("la transcripción", ext({ resumen: "  " }), META).resumen).toBe("la transcripción");
  });
});

describe("buildReport — red de seguridad de criticidad", () => {
  it("eleva a ALTA cuando el resumen tiene términos de riesgo aunque el modelo diga BAJA", () => {
    const r = buildReport(
      "t",
      ext({ prioridad: "BAJA", resumen: "Hematomas no compatibles con una caída; derivación al equipo de protección." }),
      META,
    );
    expect(r.prioridad).toBe("ALTA");
    expect(r.motivoCriticidad).toMatch(/Elevado a ALTA/);
  });

  it("detecta el riesgo en las acciones pendientes (con o sin tildes)", () => {
    const r = buildReport(
      "t",
      ext({ prioridad: "MEDIA", resumen: "Visita.", accionesPendientes: ["Contacto con violencia de género"] }),
      META,
    );
    expect(r.prioridad).toBe("ALTA");
  });

  it("NO toca la prioridad cuando no hay términos de riesgo", () => {
    const r = buildReport(
      "t",
      ext({ prioridad: "BAJA", resumen: "Visita de rutina sin novedades, todo en orden." }),
      META,
    );
    expect(r.prioridad).toBe("BAJA");
    expect(r.motivoCriticidad).toBe("");
  });

  it("preserva el motivo original del modelo al elevar", () => {
    const r = buildReport(
      "t",
      ext({ prioridad: "MEDIA", motivoCriticidad: "Ausentismo escolar", resumen: "Caso de abuso detectado." }),
      META,
    );
    expect(r.prioridad).toBe("ALTA");
    expect(r.motivoCriticidad).toContain("Ausentismo escolar");
  });
});
