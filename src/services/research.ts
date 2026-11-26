// Research step: audit the client's current site and keep what we learn about
// the business. Runs before concepts so they can be written from real facts.
// Neither step changes the pipeline stage; both are logged.
import type { Db } from "../core/db";
import { logEvent } from "../pipeline/engine";
import { analyzeSnapshot, fetchSnapshot, type AuditReport, type SiteSnapshot } from "../research/audit";
import { ClientProfileSchema } from "../research/profile";

export async function recordAudit(db: Db, clientId: string, report: AuditReport) {
  const audit = await db.siteAudit.create({
    data: {
      clientId, url: report.url, phpVersion: report.stack.php.version, wpVersion: report.stack.wordpress,
      critical: report.summary.critical, high: report.summary.high, report: report as any,
    },
  });
  await logEvent(db, clientId, "SITE_AUDITED", { auditId: audit.id, php: report.stack.php.version, ...report.summary });
  return audit;
}

/** Audits client.website live (worker job AUDIT_SITE), or from a saved snapshot. */
export async function auditClientSite(db: Db, clientId: string, snapshot?: SiteSnapshot) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  if (!snapshot) {
    if (!client.website) throw new Error(`${client.businessName} has no website on file`);
    snapshot = await fetchSnapshot(/^https?:/.test(client.website) ? client.website : `https://${client.website}`);
  }
  return recordAudit(db, clientId, analyzeSnapshot(snapshot));
}

export async function setClientProfile(db: Db, clientId: string, profile: unknown, actor = "owner") {
  const parsed = ClientProfileSchema.parse(profile);
  await db.client.update({ where: { id: clientId }, data: { profile: parsed as any } });
  await logEvent(db, clientId, "PROFILE_UPDATED", { services: parsed.serviceGroups.reduce((n, g) => n + g.groups.length, 0), team: parsed.team.length }, actor);
}

export async function requestAudit(db: Db, clientId: string) {
  await db.job.create({ data: { type: "AUDIT_SITE", payload: { clientId } } });
  await logEvent(db, clientId, "JOB_QUEUED", { type: "AUDIT_SITE" });
}
