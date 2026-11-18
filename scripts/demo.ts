// Runs the whole pipeline once against the dev DB with fake providers and
// prints what happens at each step. `npm run demo`
import { db } from "../src/core/db";
import { sentLog } from "../src/integrations/email/console";
import { runImport } from "../src/intake/importer";
import { runDueJobs } from "../src/jobs/queue";
import { approveConcepts, requestConcepts } from "../src/services/concepts";
import { handlePaymentEvent, startCheckout } from "../src/services/orders";
import { approveMessage } from "../src/services/outreach";
import { chooseFavorite, loadPortal, submitFeedback } from "../src/services/portal";

const step = (s: string) => console.log(`\n▸ ${s}`);
const stage = async (id: string) => (await db.client.findUniqueOrThrow({ where: { id } })).stage;

step("Import the sample Discord sheet and QuickBooks export");
const { readFileSync } = await import("node:fs");
for (const [src, f] of [["discord_sheet", "discord-sample.csv"], ["quickbooks_csv", "quickbooks-customers.csv"]] as const) {
  const r = await runImport(db, src, { fileName: f, data: readFileSync(`tests/fixtures/${f}`) });
  console.log(`  ${src}: ${r.created} new, ${r.updated} merged`);
}
const client = await db.client.findFirstOrThrow({ where: { email: "mike@bergenplumbing.test" } });
console.log(`  following: ${client.businessName} (${await stage(client.id)})`);

step("Generate concepts");
if ((await stage(client.id)) === "NEW") { await requestConcepts(db, client.id); await runDueJobs(db); }
console.log(`  stage: ${await stage(client.id)}`);

step("Owner approves concepts -> invite email drafted, waiting for approval");
if ((await stage(client.id)) === "CONCEPTS_IN_REVIEW") await approveConcepts(db, client.id);
const msg = await db.outboundMessage.findFirst({ where: { clientId: client.id, status: "PENDING_APPROVAL" } });
if (msg) { console.log(`  draft: "${msg.subject}"`); await approveMessage(db, msg.id); await runDueJobs(db); }
console.log(`  stage: ${await stage(client.id)}`);

const invite = sentLog.find((m) => m.to === client.email);
if (!invite) { console.log("Client was already past invite stage; reset dev.db to rerun the full demo."); process.exit(0); }
const token = invite.text.match(/\/p\/([\w-]+)/)![1];
console.log(`  portal: http://localhost:3000/p/${token}`);

step("Client rates sections and picks a favorite");
const portal = await loadPortal(db, token);
const c = portal.concepts[0];
await submitFeedback(db, token, { conceptId: c.id, sectionId: c.sections[0].id, rating: 5, comment: "Love this hero" });
await chooseFavorite(db, token, c.id);
console.log(`  stage: ${await stage(client.id)}`);

step("Client buys hosted site; payment webhook arrives");
const s = await startCheckout(db, token, "HOSTED_SITE");
await handlePaymentEvent(db, { type: "checkout.completed", checkoutId: s.checkoutId, subscriptionId: "fake_sub" });
await runDueJobs(db);
const order = await db.order.findFirstOrThrow({ where: { clientId: client.id }, include: { deployment: true } });
console.log(`  order ${order.status}, site ${order.deployment?.siteUrl}`);
console.log(`  stage: ${await stage(client.id)}`);
console.log(`\nAdmin: http://localhost:3000/admin/clients/${client.id}`);
