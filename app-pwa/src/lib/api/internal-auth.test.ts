import { describe, it, expect, afterEach } from "vitest";
import { assertInternalCall, timingSafeEqual } from "./internal-auth";

describe("timingSafeEqual", () => {
  it("true solo para strings idénticos", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
    expect(timingSafeEqual("abc123", "abc124")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("assertInternalCall", () => {
  const original = process.env.N8N_CALLBACK_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.N8N_CALLBACK_SECRET;
    else process.env.N8N_CALLBACK_SECRET = original;
  });

  const req = (token?: string) =>
    new Request("http://x/api/informe/id/extraccion", {
      method: "POST",
      headers: token ? { "x-internal-token": token } : {},
    });

  it("sin secreto configurado → deja pasar (dev)", () => {
    delete process.env.N8N_CALLBACK_SECRET;
    expect(assertInternalCall(req())).toBeNull();
  });

  it("con secreto y token correcto → deja pasar", () => {
    process.env.N8N_CALLBACK_SECRET = "s3cr3t";
    expect(assertInternalCall(req("s3cr3t"))).toBeNull();
  });

  it("con secreto y token ausente/incorrecto → 401", () => {
    process.env.N8N_CALLBACK_SECRET = "s3cr3t";
    expect(assertInternalCall(req())?.status).toBe(401);
    expect(assertInternalCall(req("malo"))?.status).toBe(401);
  });
});
