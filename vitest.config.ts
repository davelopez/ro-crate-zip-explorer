import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["**/*.test.ts"],
    coverage: {
      exclude: ["**/examples/**", "index.ts", ...coverageConfigDefaults.exclude],
    },
  },
});
