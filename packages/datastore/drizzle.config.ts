import { defineConfig } from "drizzle-kit";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
