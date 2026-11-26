// Runs the agency pipeline for one real client folder under case-studies/ and
// writes what happened to <folder>/out/. Nothing is sent to the client: the
// portal invite is left in the Outbox waiting for the owner's approval.
//
//   npm run case-study -- case-studies/central-jersey-law [--live]
//
// The folder holds client.json (intake record), profile.json (research) and
// snapshot/ (saved audit snapshot; --live re-fetches the site instead).
export {};
process.env.CONCEPT_PROVIDER ??= "researched";
process.env.TEMPLATE_PROVIDER ??= "wp-block-theme";
process.env.CONCEPTS_PER_CLIENT ??= "2";

const { mkdirSync, writeFileSync } = await import("node:fs");
const { join, resolve } = await import("node:path");
const { db } = await import("../src/core/db");
const { runCaseStudy } = await import("../src/services/caseStudy");

const dir = process.argv[2];
if (!dir) { console.error("Usage: npm run case-study -- case-studies/<client>"); process.exit(2); }
const out = join(dir, "out");
mkdirSync(out, { recursive: true });

const r = await runCaseStudy(db, resolve(dir), { live: process.argv.includes("--live"), approve: true });
const report: any = r.audit.report;
console.log(`▸ Intake: ${r.client.businessName} (${r.imported.created} new, ${r.imported.updated} merged)`);
console.log(`▸ Audit: PHP ${r.audit.phpVersion} (${report.stack.php.status}), WordPress ${r.audit.wpVersion}, ${report.findings.length} findings ${JSON.stringify(report.summary)}`);
console.log(`▸ Concepts:`);
for (const c of r.concepts) console.log(`  ${c.name}: ${c.sections.map((s) => s.kind).join(" → ")}\n    package ${c.packagePath}`);
console.log(`▸ Approval gate: invite ${r.invite?.status} — "${r.invite?.subject}" (not sent)`);
console.log(`  portal: ${r.portalUrl}\n  stage: ${r.stage}`);

writeFileSync(join(out, "audit.json"), JSON.stringify(report, null, 2));
writeFileSync(join(out, "run.json"), JSON.stringify({
  clientId: r.client.id, stage: r.stage, auditId: r.audit.id,
  concepts: r.concepts.map((c) => ({ id: c.id, name: c.name, templateKey: c.templateKey, packagePath: c.packagePath, sections: c.sections.map((s) => s.kind) })),
  invite: r.invite && { id: r.invite.id, status: r.invite.status, to: r.invite.toEmail, subject: r.invite.subject }, portal: r.portalUrl,
}, null, 2));
console.log(`\nWrote ${out}/run.json and audit.json. Admin: http://localhost:3000/admin/clients/${r.client.id}`);
await db.$disconnect();
