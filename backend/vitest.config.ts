import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = "file:./test.db";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./tests/globalSetup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret",
    },
    testTimeout: 20000,
    hookTimeout: 20000,
    // Test files share one SQLite file and drive the same seeded UNIT-01,
    // so they must not run concurrently against it.
    fileParallelism: false,
  },
});
