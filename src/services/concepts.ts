import { getConfig } from "../core/config";
import type { Db } from "../core/db";
import { providers } from "../integrations/registry";
import { logEvent, transition } from "../pipeline/engine";

/** Generate concepts for a client (run by the worker via the GENERATE_CONCEPTS job). */
export async function generateConcepts(db: Db, clientId: string, generator?: string) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const gen = providers.concepts(generator);
  const builder = providers.templates();
  const drafts = await gen.generate(client, getConfig().conceptsPerClient);

  // Regeneration replaces earlier drafts that were never approved.
  await db.concept.updateMany({ where: { clientId, status: "DRAFT" }, data: { status: "ARCHIVED" } });

  for (const d of drafts) {
    const concept = await db.concept.create({
      data: {
        clientId, name: d.name, templateKey: d.templateKey, styleDirection: d.styleDirection,
        palette: d.palette, generator: gen.id,
        sections: { create: d.sections.map((s, i) => ({ kind: s.kind, title: s.title, position: i, content: s.content as any, previewAnchor: s.kind.toLowerCase() })) },
      },
      include: { sections: true, client: true },
    });
    const built = await builder.build(concept);
    await db.concept.update({ where: { id: concept.id }, data: built });
  }
  await transition(db, clientId, "CONCEPTS_GENERATED", { data: { count: drafts.length, generator: gen.id } });

  if (!getConfig().conceptsRequireApproval) await approveConcepts(db, clientId, "auto");
}

/** Eric approves the concepts to show (or all drafts if none given). Drafts the invite email. */
export async function approveConcepts(db: Db, clientId: string, actor = "owner", conceptIds?: string[]) {
  const where = { clientId, status: "DRAFT", ...(conceptIds ? { id: { in: conceptIds } } : {}) };
  const { count } = await db.concept.updateMany({ where, data: { status: "APPROVED" } });
  if (!count) throw new Error("No draft concepts to approve");
  if (conceptIds) await db.concept.updateMany({ where: { clientId, status: "DRAFT" }, data: { status: "REJECTED" } });
  await transition(db, clientId, "CONCEPTS_APPROVED", { actor, data: { count } });
  const { draftPortalInvite } = await import("./outreach");
  await draftPortalInvite(db, clientId);
}

/** `generator` overrides CONCEPT_PROVIDER for this one request (case studies always use "researched"). */
export async function requestConcepts(db: Db, clientId: string, actor = "owner", generator?: string) {
  await transition(db, clientId, "REQUEST_CONCEPTS", { actor });
  await db.job.create({ data: { type: "GENERATE_CONCEPTS", payload: generator ? { clientId, generator } : { clientId } } });
  await logEvent(db, clientId, "JOB_QUEUED", { type: "GENERATE_CONCEPTS" });
}
