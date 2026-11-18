import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/globalSetup.ts",
    env: { DATABASE_URL: "file:./test.db", NODE_ENV: "test", APP_URL: "http://localhost:3000" },
    fileParallelism: false,
  },
});
