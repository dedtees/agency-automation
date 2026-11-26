import { db } from "../src/core/db";
export { db };
export async function resetDb() {
  // Child tables first.
  for (const t of ["feedback", "siteAudit", "templateDelivery", "deployment", "order", "section", "concept", "outboundMessage", "portalAccess", "pipelineEvent", "clientSource", "client", "importRun", "job"] as const)
    await (db as any)[t].deleteMany();
}
