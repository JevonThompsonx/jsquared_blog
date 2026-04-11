import { defineConfig } from "vitest/config";
import path from "node:path";
import { transform } from "esbuild";

const tsEsbuildPlugin = {
  name: "vitest-ts-esbuild",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    const [filePath] = id.split("?");

    if (/[\\/]node_modules[\\/]/.test(filePath)) {
      return null;
    }

    if (!/\.(?:cts|mts|ts|tsx)$/.test(filePath)) {
      return null;
    }

    const result = await transform(code, {
      format: "esm",
      loader: filePath.endsWith("x") ? "tsx" : "ts",
      sourcemap: true,
      target: "es2020",
      jsx: "automatic",
    });

    return {
      code: result.code,
      map: result.map,
    };
  },
};

export default defineConfig({
  oxc: false,
  plugins: [tsEsbuildPlugin],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
  },
});
