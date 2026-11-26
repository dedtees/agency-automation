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

const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import("node:fs");
const { join } = await import("node:path");
const { db } = await import("../src/core/db");
const { runImport } = await import("../src/intake/importer");
const { runDueJobs } = await import("../src/jobs/queue");
const { loadSnapshot } = await import("../src/research/snapshotFile");
const { approveConcepts, requestConcepts } = await import("../src/services/concepts");
const { auditClientSite, setClientProfile } = await import("../src/services/research");

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "client.json"))) { console.error("Usage: npm run case-study -- case-studies/<client>"); process.exit(2); }
const out = join(dir, "out");
mkdirSync(out, { recursive: true });
const step = (s: string) => console.log(`\n▸ ${s}`);
const stage = async (id: string) => (await db.client.findUniqueOrThrow({ where: { id } })).stage;

step("Intake");
const records = JSON.parse(readFileSync(join(dir, "client.json"), "utf8"));
const imp = await runImport(db, "manual", { records });
const client = await db.client.findFirstOrThrow({ where: { website: records[0].website }, orderBy: { createdAt: "desc" } });
console.log(`  ${client.businessName}: ${imp.created} new, ${imp.updated} merged (stage ${client.stage})`);

step("Research: audit the current site");
const audit = await auditClientSite(db, client.id, process.argv.includes("--live") ? undefined : loadSnapshot(join(dir, "snapshot")));
const report: any = audit.report;
console.log(`  PHP ${audit.phpVersion} (${report.stack.php.status}), WordPress ${audit.wpVersion}, ${report.findings.length} findings: ${JSON.stringify(report.summary)}`);
writeFileSync(join(out, "audit.json"), JSON.stringify(report, null, 2));

step("Research: business profile");
await setClientProfile(db, client.id, JSON.parse(readFileSync(join(dir, "profile.json"), "utf8")), "research");
console.log("  profile saved");

step("Generate concepts (researched copy → WordPress block themes)");
if (["NEW", "CONCEPTS_IN_REVIEW"].includes(await stage(client.id))) { await requestConcepts(db, client.id, "case-study"); await runDueJobs(db); }
const concepts = await db.concept.findMany({ where: { clientId: client.id, status: { in: ["DRAFT", "APPROVED"] } }, include: { sections: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } });
for (const c of concepts) console.log(`  ${c.name}: ${c.sections.map((s) => s.kind).join(" → ")}\n    package ${c.packagePath}`);
console.log(`  stage: ${await stage(client.id)}`);

step("Owner approval → client portal + invite draft (not sent)");
if ((await stage(client.id)) === "CONCEPTS_IN_REVIEW") await approveConcepts(db, client.id, "owner");
const invite = await db.outboundMessage.findFirst({ where: { clientId: client.id, kind: "PORTAL_INVITE" }, orderBy: { createdAt: "desc" } });
const portal = invite?.body.match(/https?:\/\/\S+\/p\/[\w-]+/)?.[0];
console.log(`  invite: ${invite?.status} — "${invite?.subject}"`);
console.log(`  portal: ${portal}`);
console.log(`  stage: ${await stage(client.id)}`);

writeFileSync(join(out, "run.json"), JSON.stringify({
  clientId: client.id, stage: await stage(client.id), auditId: audit.id,
  concepts: concepts.map((c) => ({ id: c.id, name: c.name, templateKey: c.templateKey, packagePath: c.packagePath, sections: c.sections.map((s) => s.kind) })),
  invite: invite && { id: invite.id, status: invite.status, to: invite.toEmail, subject: invite.subject }, portal,
}, null, 2));
console.log(`\nWrote ${out}/run.json and audit.json. Admin: http://localhost:3000/admin/clients/${client.id}`);
await db.$disconnect();
