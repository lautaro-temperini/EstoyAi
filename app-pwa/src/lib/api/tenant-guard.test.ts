import { describe, it, expect } from "vitest";
import { informeBelongsToRequest } from "./tenant-guard";
import type { InformeRow } from "@/lib/db/sqlite";

function rowForTenant(tenant: string | null): InformeRow {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    estado: "LISTO",
    audioPath: null,
    metadata: { tenant } as InformeRow["metadata"],
    informeJson: null,
    campos: {} as InformeRow["campos"],
    error: null,
    enviado: false,
    enviadoAt: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

const headersWith = (tenant: string) => new Headers({ "x-tenant": tenant });

describe("informeBelongsToRequest", () => {
  it("permite cuando el tenant del informe coincide con x-tenant", () => {
    expect(informeBelongsToRequest(rowForTenant("dtcvillatranquila"), headersWith("dtcvillatranquila"))).toBe(true);
  });

  it("bloquea cross-tenant (IDOR): ONG A pidiendo informe de ONG B", () => {
    expect(informeBelongsToRequest(rowForTenant("dtcvillatranquila"), headersWith("pequenospasos"))).toBe(false);
  });

  it("fila con tenant null no pertenece a ningún tenant explícito", () => {
    expect(informeBelongsToRequest(rowForTenant(null), headersWith("pequenospasos"))).toBe(false);
  });
});
