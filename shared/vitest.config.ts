import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run in Node (schemas and types don't need a browser environment)
    environment: "node",
    // Use 'forks' pool to avoid Windows file-URL issues with the default vmThreads pool
    pool: "forks",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.ts"],
    },
  },
});
