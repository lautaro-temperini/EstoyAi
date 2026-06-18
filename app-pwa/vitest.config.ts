import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests unitarios (Vitest). Alias "@/" → src, igual que tsconfig. Entorno node:
// los tests cubren lógica pura (sin DOM ni better-sqlite3 nativo).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
