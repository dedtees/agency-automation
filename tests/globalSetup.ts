import { execSync } from "node:child_process";
// Tests run against a throwaway Postgres database (TEST_DATABASE_URL).
// Each test file empties the tables itself (tests/helpers.ts).
export default function () {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/agency_test";
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "ignore",
  });
}
