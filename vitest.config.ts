import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/agency_test";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    globalSetup: "./tests/globalSetup.ts",
    env: { DATABASE_URL: testDb, DIRECT_URL: testDb, NODE_ENV: "test", APP_URL: "http://localhost:3000" },
    fileParallelism: false,
  },
});
