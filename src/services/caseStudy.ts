// Loads one real client from a case-studies/<client>/ folder and runs the
// pipeline up to the owner's approval: intake, site audit (saved snapshot
// unless live), researched profile, concepts. Used by `npm run case-study`
// and by the admin's "Load case study" button. Nothing is sent to anyone.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "../core/db";
import { runImport } from "../intake/importer";
import { runDueJobs } from "../jobs/queue";
import { loadSnapshot } from "../research/snapshotFile";
import { approveConcepts, requestConcepts } from "./concepts";
import { auditClientSite, setClientProfile } from "./research";

/** Case studies that ship with the app (folders under case-studies/). */
export const CASE_STUDIES = [{ slug: "central-jersey-law", label: "Central Jersey Law (Savo Schalk)" }] as const;

export function caseStudyDir(slug: string) {
  if (!CASE_STUDIES.some((c) => c.slug === slug)) throw new Error(`Unknown case study: ${slug}`);
  return join(process.cwd(), "case-studies", slug);
}

export async function runCaseStudy(db: Db, dir: string, opts: { live?: boolean; approve?: boolean; actor?: string } = {}) {
  const actor = opts.actor ?? "case-study";
  if (!existsSync(join(dir, "client.json"))) throw new Error(`No client.json in ${dir}`);
  const records = JSON.parse(readFileSync(join(dir, "client.json"), "utf8"));
  const imp = await runImport(db, "manual", { records });
  const client = await db.client.findFirstOrThrow({ where: { website: records[0].website }, orderBy: { createdAt: "desc" } });

  const audit = await auditClientSite(db, client.id, opts.live ? undefined : loadSnapshot(join(dir, "snapshot")));
  await setClientProfile(db, client.id, JSON.parse(readFileSync(join(dir, "profile.json"), "utf8")), "research");

  const stage = async () => (await db.client.findUniqueOrThrow({ where: { id: client.id } })).stage;
  if (["NEW", "CONCEPTS_IN_REVIEW"].includes(await stage())) {
    await requestConcepts(db, client.id, actor, "researched");
    await runDueJobs(db);
  }
  if (opts.approve && (await stage()) === "CONCEPTS_IN_REVIEW") await approveConcepts(db, client.id, "owner");

  const concepts = await db.concept.findMany({
    where: { clientId: client.id, status: { in: ["DRAFT", "APPROVED"] } },
    include: { sections: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  const invite = await db.outboundMessage.findFirst({ where: { clientId: client.id, kind: "PORTAL_INVITE" }, orderBy: { createdAt: "desc" } });
  return { client, imported: imp, audit, concepts, invite, portalUrl: invite ? portalUrlFrom(invite.body) : undefined, stage: await stage() };
}

/** The portal link inside a drafted invite email. */
export function portalUrlFrom(body: string) {
  return body.match(/https?:\/\/\S+\/p\/[\w-]+/)?.[0];
}
