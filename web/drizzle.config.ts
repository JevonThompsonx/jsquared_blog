import { loadEnvironmentFiles } from "./src/lib/env-loader";
import { defineConfig } from "drizzle-kit";

loadEnvironmentFiles();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const isFileDatabase = Boolean(url?.startsWith("file:"));

if (!url || (!isFileDatabase && !authToken)) {
  throw new Error(
    "Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN for remote libsql URLs) before running Drizzle commands.",
  );
}

export default defineConfig(
  isFileDatabase
    ? {
        schema: "./src/drizzle/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url: url as string },
      }
    : {
        schema: "./src/drizzle/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url: url as string, authToken: authToken as string },
      },
);
