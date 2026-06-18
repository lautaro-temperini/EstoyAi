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

  it("resumen vacío cae a la transcripción", () => {
    expect(buildReport("la transcripción", ext({ resumen: "  " }), META).resumen).toBe("la transcripción");
  });
});
