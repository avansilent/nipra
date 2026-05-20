import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", ".open-next/**", "out/**", "coverage/**"],
  },
];

export default config;
