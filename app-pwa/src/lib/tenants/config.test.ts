import { describe, it, expect } from "vitest";
import {
  tenantForHost,
  tenantBySlug,
  isLandingHost,
  normalizeHost,
  DEFAULT_TENANT,
} from "./config";

describe("normalizeHost", () => {
  it("saca puerto y baja a minúsculas", () => {
    expect(normalizeHost("Pequenos.EstoyAi.com:3000")).toBe("pequenos.estoyai.com");
  });
  it("vacío/null → string vacío", () => {
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost(undefined)).toBe("");
  });
});

describe("tenantForHost", () => {
  it("resuelve un subdominio conocido", () => {
    expect(tenantForHost("dtcvillatranquila.estoyai.com").slug).toBe("dtcvillatranquila");
  });
  it("apex / www / localhost → DEFAULT_TENANT", () => {
    expect(tenantForHost("estoyai.com").slug).toBe(DEFAULT_TENANT.slug);
    expect(tenantForHost("www.estoyai.com").slug).toBe(DEFAULT_TENANT.slug);
    expect(tenantForHost("localhost:3000").slug).toBe(DEFAULT_TENANT.slug);
  });
  it("subdominio desconocido → DEFAULT_TENANT (no rompe)", () => {
    expect(tenantForHost("inexistente.estoyai.com").slug).toBe(DEFAULT_TENANT.slug);
  });
  it("dominio ajeno → DEFAULT_TENANT", () => {
    expect(tenantForHost("dtcvillatranquila.otrodominio.com").slug).toBe(DEFAULT_TENANT.slug);
  });
});

describe("tenantBySlug", () => {
  it("resuelve por slug y cae al default", () => {
    expect(tenantBySlug("dtcvillatranquila").slug).toBe("dtcvillatranquila");
    expect(tenantBySlug(null).slug).toBe(DEFAULT_TENANT.slug);
    expect(tenantBySlug("nope").slug).toBe(DEFAULT_TENANT.slug);
  });
});

describe("isLandingHost", () => {
  it("apex y www son landing; un subdominio de ONG no", () => {
    expect(isLandingHost("estoyai.com")).toBe(true);
    expect(isLandingHost("www.estoyai.com")).toBe(true);
    expect(isLandingHost("dtcvillatranquila.estoyai.com")).toBe(false);
    expect(isLandingHost("localhost")).toBe(false);
  });
});
