// Audit a website from the outside.
//   npm run audit -- https://example.com            live, prints findings
//   npm run audit -- https://example.com --save dir also saves the snapshot
//   npm run audit -- --from dir                     re-runs on a saved snapshot
//   add --client <id> to store the result on a client, --json for raw output
import { db } from "../src/core/db";
import { analyzeSnapshot, fetchSnapshot } from "../src/research/audit";
import { loadSnapshot, saveSnapshot } from "../src/research/snapshotFile";
import { recordAudit } from "../src/services/research";

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const url = args.find((a) => /^https?:\/\//.test(a));
const from = opt("from");
if (!url && !from) { console.error("Usage: npm run audit -- <url> [--save dir] | --from <dir> [--client id] [--json]"); process.exit(2); }

const snapshot = from ? loadSnapshot(from) : await fetchSnapshot(url!);
if (opt("save")) saveSnapshot(opt("save")!, snapshot);
const report = analyzeSnapshot(snapshot);
if (opt("client")) await recordAudit(db, opt("client")!, report);

if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  const s = report.stack;
  console.log(`${report.url}  (${report.auditedAt.slice(0, 10)})`);
  console.log(`PHP ${s.php.version ?? "?"} [${s.php.status}] · WordPress ${s.wordpress ?? "?"} · theme ${s.theme.name ?? s.theme.slug ?? "?"} (${s.theme.kind}) · ${s.plugins.length} plugins`);
  console.log(`${report.summary.critical} critical, ${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low\n`);
  for (const f of report.findings) console.log(`[${f.severity.toUpperCase()}] ${f.title}\n    ${f.detail}\n    → ${f.fix}`);
}
await db.$disconnect();
