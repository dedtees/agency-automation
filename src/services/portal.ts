// Private client portal: one unguessable link per client. We store only a hash.
import { createHash, randomBytes } from "node:crypto";
import { getConfig } from "../core/config";
import type { Db } from "../core/db";
import { FeedbackInputSchema, type FeedbackInput } from "../core/types";
import { logEvent, transition } from "../pipeline/engine";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createPortalLink(db: Db, clientId: string) {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + getConfig().portalLinkDays * 86_400_000);
  await db.portalAccess.create({ data: { clientId, tokenHash: hash(token), expiresAt } });
  return { token, url: `${getConfig().appUrl}/p/${token}`, expiresAt };
}

export class PortalAccessError extends Error {}

export async function resolvePortal(db: Db, token: string) {
  const access = await db.portalAccess.findUnique({ where: { tokenHash: hash(token) } });
  if (!access || access.revokedAt || access.expiresAt < new Date()) throw new PortalAccessError("This link is invalid or has expired.");
  return access;
}

/** Everything the portal page needs. Only APPROVED concepts are ever shown. */
export async function loadPortal(db: Db, token: string) {
  const access = await resolvePortal(db, token);
  const client = await db.client.findUniqueOrThrow({
    where: { id: access.clientId },
    include: {
      concepts: { where: { status: "APPROVED" }, include: { sections: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } },
      feedback: true,
      orders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!access.lastViewedAt) {
    await logEvent(db, client.id, "PORTAL_FIRST_VIEW");
    await transition(db, client.id, "PORTAL_ACTIVITY", { actor: "client", allowNoop: true });
  }
  await db.portalAccess.update({ where: { id: access.id }, data: { lastViewedAt: new Date() } });
  return client;
}

export async function submitFeedback(db: Db, token: string, input: FeedbackInput) {
  const { clientId } = await resolvePortal(db, token);
  const f = FeedbackInputSchema.parse(input);
  const concept = await db.concept.findFirst({ where: { id: f.conceptId, clientId, status: "APPROVED" } });
  if (!concept) throw new PortalAccessError("Unknown concept");
  if (f.sectionId) {
    const ok = await db.section.findFirst({ where: { id: f.sectionId, conceptId: concept.id } });
    if (!ok) throw new PortalAccessError("Unknown section");
  }
  const sectionId = f.sectionId ?? null;
  // Prisma can't upsert on a compound unique containing NULL, so do it by hand.
  const existing = await db.feedback.findFirst({ where: { clientId, conceptId: concept.id, sectionId } });
  const data = { rating: f.rating ?? null, comment: f.comment ?? null };
  const saved = existing
    ? await db.feedback.update({ where: { id: existing.id }, data })
    : await db.feedback.create({ data: { clientId, conceptId: concept.id, sectionId, ...data } });
  await transition(db, clientId, "PORTAL_ACTIVITY", { actor: "client", allowNoop: true });
  return saved;
}

export async function chooseFavorite(db: Db, token: string, conceptId: string) {
  const { clientId } = await resolvePortal(db, token);
  const concept = await db.concept.findFirst({ where: { id: conceptId, clientId, status: "APPROVED" } });
  if (!concept) throw new PortalAccessError("Unknown concept");
  await db.client.update({ where: { id: clientId }, data: { favoriteConceptId: conceptId } });
  await transition(db, clientId, "FAVORITE_CHOSEN", { actor: "client", data: { conceptId } });
}

/** Per-section summary for Eric: average rating and comments across concepts. */
export async function feedbackSummary(db: Db, clientId: string) {
  const concepts = await db.concept.findMany({
    where: { clientId, status: "APPROVED" },
    include: { sections: { orderBy: { position: "asc" }, include: { feedback: true } }, feedback: { where: { sectionId: null } } },
  });
  return concepts.map((c) => ({
    concept: c.name,
    overall: c.feedback[0] ?? null,
    sections: c.sections.map((s) => ({ section: s.title, rating: s.feedback[0]?.rating ?? null, comment: s.feedback[0]?.comment ?? null })),
  }));
}
