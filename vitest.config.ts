import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],

    // Thread pool configuration (v4.0)
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // TypeScript type checking in tests (v4.0)
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
      include: ["**/*.test.ts"],
      checker: "tsc",
    },

    // Better error tracking
    onConsoleLog: (log, type) => {
      // Filter out noise from tests if needed
      return true;
    },

    // Fail fast on first error (useful for CI)
    bail: 1,

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "**/*.d.ts",
        "**/index.ts",
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      // Better coverage reporting (v4.0)
      clean: true,
      cleanOnRerun: true,
      reportsDirectory: "./coverage",
    },

    testTimeout: 10000,
    hookTimeout: 10000,

    // Mock behavior (v4.0)
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Improved test isolation (v4.0)
    isolate: true,

    // Better test retry logic (v4.0)
    retry: 0,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
