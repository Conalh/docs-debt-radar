import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@docs-debt-radar/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"]
  }
});
