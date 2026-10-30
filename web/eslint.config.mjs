import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      ".cloudflare/**",
      "dist/**",
      ".vinext/**",
    ],
  },
];

export default config;
