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
  plugins: [tsEsbuildPlugin],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workos-inc/authkit-nextjs/components": path.resolve(
        __dirname,
        "./tests/unit/stubs/authkit-components.tsx",
      ),
      "server-only": path.resolve(
        __dirname,
        "./tests/unit/server-only-stub.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
    env: {
      NEXT_PUBLIC_SITE_URL: "https://jsquaredadventures.com",
      WORKOS_CLIENT_ID: "client_test_dummy",
      WORKOS_ISSUER: "https://auth.example.test",
      NEXT_PUBLIC_WORKOS_REDIRECT_URI:
        "https://jsquaredadventures.com/callback",
      WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
      WORKOS_COOKIE_MAX_AGE: "1209600",
    },
  },
});
