import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export -- Vitest config requires default export
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/shared/**/*.ts",
        "src/features/**/*.ts",
        "src/entities/**/*.ts",
        "app/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/index.ts",
        ".next/**",
        "src/shared/ui/**",
        "src/shared/types/**",
        "next.config.ts",
        "vitest.config.ts",
        "vitest.setup.ts",
      ],
    },
  },
});
