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
        "**/*.d.ts",
        "**/*.d.ts.map",
        "**/index.ts",
      ],
      // Instrument source files for proper coverage tracking
      all: true,
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
  // Thread pool options (Vitest 4.0 - moved to top level)
  poolOptions: {
    threads: {
      singleThread: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
