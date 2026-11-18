// CLI import: npm run import -- <source> [file] [--map businessName="Server Name"]
//   sources: discord_sheet | quickbooks_csv | quickbooks_api | manual (JSON file of records)
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { db } from "../src/core/db";
import { runImport } from "../src/intake/importer";

const [source, file, ...rest] = process.argv.slice(2);
if (!source) { console.error("usage: npm run import -- <source> [file] [--map field=Header ...]"); process.exit(1); }
const columnMap: Record<string, string> = {};
rest.forEach((a, i) => { if (a === "--map") { const [k, v] = rest[i + 1].split("="); columnMap[k] = v; } });

const input = source === "manual"
  ? { records: JSON.parse(readFileSync(file, "utf8")) }
  : source === "quickbooks_api" ? {} : { fileName: basename(file), data: readFileSync(file), columnMap };
const run = await runImport(db, source, input);
console.log(`${source}: ${run.created} new, ${run.updated} updated, ${run.skipped} unchanged`);
if (Array.isArray(run.errors)) for (const e of run.errors as any[]) console.log(`  row ${e.row} rejected: ${e.reason}`);
