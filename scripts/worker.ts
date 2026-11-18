// Background worker: runs queued pipeline jobs every few seconds.
import { db } from "../src/core/db";
import { runDueJobs } from "../src/jobs/queue";

const INTERVAL = Number(process.env.WORKER_INTERVAL_MS ?? 5000);
console.log(`[worker] polling every ${INTERVAL}ms`);
for (;;) {
  const n = await runDueJobs(db);
  if (n) console.log(`[worker] ran ${n} job(s)`);
  await new Promise((r) => setTimeout(r, INTERVAL));
}
