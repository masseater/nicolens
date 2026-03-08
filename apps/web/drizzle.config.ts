import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- required for drizzle-kit CLI
    url: process.env["DATABASE_URL"]!,
  },
});
