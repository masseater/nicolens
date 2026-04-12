import { drizzle } from "drizzle-orm/postgres-js";

const getDatabaseUrl = (): string => {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
};

export const getDb = () => drizzle(getDatabaseUrl());
