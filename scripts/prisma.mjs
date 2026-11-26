// Runs Prisma in build steps without failing when the database isn't configured yet.
//   node scripts/prisma.mjs generate   -> always works (generate never connects)
//   node scripts/prisma.mjs migrate    -> applies migrations, or skips with a warning
// Lets a Vercel deploy succeed before DATABASE_URL / DIRECT_URL are added.
import { execSync } from "node:child_process";

const cmd = process.argv[2];
const env = { ...process.env };
const configured = Boolean(env.DATABASE_URL);
// Supabase names the direct connection DIRECT_URL; Neon (via Vercel) names it DATABASE_URL_UNPOOLED.
env.DIRECT_URL ||= env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;

if (cmd === "generate") {
  // The schema reads these env vars; generate only needs them to exist.
  env.DATABASE_URL ||= "postgresql://placeholder@localhost:5432/placeholder";
  env.DIRECT_URL ||= env.DATABASE_URL;
  execSync("npx prisma generate", { stdio: "inherit", env });
} else if (cmd === "migrate") {
  if (!configured) {
    console.warn("\n[prisma] DATABASE_URL is not set: skipping migrations. Connect a database (Neon or Supabase, see DEPLOY.md), then redeploy.\n");
  } else {
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  }
} else {
  console.error("usage: node scripts/prisma.mjs generate|migrate");
  process.exit(1);
}
