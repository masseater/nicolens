import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export -- vitest config requires default export
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
