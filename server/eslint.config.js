import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        // Cloudflare Workers globals
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        File: "readonly",
        fetch: "readonly",
        crypto: "readonly",
        caches: "readonly",
      },
    },
    rules: {
      // Allow justified any usage with eslint-disable comments
      "@typescript-eslint/no-explicit-any": "warn",
      // Require unknown in catch blocks (TypeScript strict)
      "@typescript-eslint/use-unknown-in-catch-variables": "off",
      // No floating promises — requires type-aware linting (disabled here)
      "@typescript-eslint/no-floating-promises": "off",
      // Prevent accidental unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
