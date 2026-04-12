import { defineConfig } from "drizzle-kit";

const getDatabaseUrl = (): string => {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
};

// oxlint-disable-next-line import/no-default-export -- drizzle-kit config requires default export
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Lazy getter so static analysis tools (knip) can load this file without DATABASE_URL set.
    // Drizzle-kit will trigger the throw when it actually needs the URL.
    get url(): string {
      return getDatabaseUrl();
    },
  },
});
