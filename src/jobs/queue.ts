// Tiny DB-backed job runner. `npm run worker` loops over runDueJobs().
// Failed jobs retry with exponential backoff up to maxAttempts.
import type { Db } from "../core/db";
import { generateConcepts } from "../services/concepts";
import { fulfillOrder } from "../services/orders";
import { sendMessage } from "../services/outreach";
import { auditClientSite } from "../services/research";
import { providers } from "../integrations/registry";

type Handler = (db: Db, payload: any) => Promise<void>;

export const handlers: Record<string, Handler> = {
  AUDIT_SITE: async (db, p) => { await auditClientSite(db, p.clientId); },
  GENERATE_CONCEPTS: (db, p) => generateConcepts(db, p.clientId, p.generator),
  SEND_MESSAGE: (db, p) => sendMessage(db, p.messageId),
  FULFILL_ORDER: (db, p) => fulfillOrder(db, p.orderId),
  SUSPEND_SITE: async (db, p) => {
    const d = await db.deployment.findUniqueOrThrow({ where: { orderId: p.orderId } });
    if (d.externalId) await providers.hosting().suspend(d.externalId);
    await db.deployment.update({ where: { id: d.id }, data: { status: "SUSPENDED" } });
  },
};

export async function runDueJobs(db: Db, limit = 20): Promise<number> {
  let ran = 0;
  for (; ran < limit; ran++) {
    const job = await db.job.findFirst({ where: { status: "QUEUED", runAt: { lte: new Date() } }, orderBy: { runAt: "asc" } });
    if (!job) break;
    // Claim it (guards against two workers grabbing the same job).
    const claimed = await db.job.updateMany({ where: { id: job.id, status: "QUEUED" }, data: { status: "RUNNING", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      const h = handlers[job.type];
      if (!h) throw new Error(`No handler for job type ${job.type}`);
      await h(db, job.payload);
      await db.job.update({ where: { id: job.id }, data: { status: "DONE", lastError: null } });
    } catch (e: any) {
      const attempts = job.attempts + 1;
      const failed = attempts >= job.maxAttempts;
      await db.job.update({
        where: { id: job.id },
        data: { status: failed ? "FAILED" : "QUEUED", lastError: String(e?.message ?? e), runAt: new Date(Date.now() + 2 ** attempts * 30_000) },
      });
    }
  }
  return ran;
}
