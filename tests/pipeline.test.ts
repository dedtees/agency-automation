import { beforeEach, describe, expect, it } from "vitest";
import { sentLog } from "../src/integrations/email/console";
import { runDueJobs } from "../src/jobs/queue";
import { InvalidTransitionError, transition } from "../src/pipeline/engine";
import { nextStage } from "../src/pipeline/stages";
import { approveConcepts, requestConcepts } from "../src/services/concepts";
import { handlePaymentEvent, startCheckout } from "../src/services/orders";
import { approveMessage } from "../src/services/outreach";
import { chooseFavorite, feedbackSummary, loadPortal, submitFeedback } from "../src/services/portal";
import { db, resetDb } from "./helpers";

beforeEach(async () => { await resetDb(); sentLog.length = 0; });

const newClient = () => db.client.create({ data: { businessName: "Bergen Plumbing Co", contactName: "Mike Bianchi", email: "mike@bergenplumbing.test", industry: "Plumbing", city: "Hackensack", state: "NJ" } });
const tokenFrom = (body: string) => body.match(/\/p\/([\w-]+)/)![1];

describe("state machine", () => {
  it("rejects out-of-order transitions", async () => {
    expect(nextStage("NEW", "PAYMENT_CONFIRMED")).toBeNull();
    const c = await newClient();
    await expect(transition(db, c.id, "INVITE_SENT")).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

async function toInvited() {
  const c = await newClient();
  await requestConcepts(db, c.id);
  await runDueJobs(db);
  expect((await db.client.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe("CONCEPTS_IN_REVIEW");
  expect(await db.concept.count({ where: { clientId: c.id, status: "DRAFT" } })).toBe(3);

  await approveConcepts(db, c.id);
  const msg = await db.outboundMessage.findFirstOrThrow({ where: { clientId: c.id } });
  expect(msg.status).toBe("PENDING_APPROVAL");
  await runDueJobs(db);
  expect(sentLog).toHaveLength(0); // nothing goes out without approval

  await approveMessage(db, msg.id);
  await runDueJobs(db);
  expect(sentLog).toHaveLength(1);
  return { client: c, token: tokenFrom(sentLog[0].text) };
}

describe("full flow with fake providers", () => {
  it("template download: concepts -> approval -> invite -> feedback -> favorite -> pay -> delivered", async () => {
    const { client, token } = await toInvited();
    const portal = await loadPortal(db, token);
    expect(portal.concepts).toHaveLength(3);
    const [c1] = portal.concepts;
    await submitFeedback(db, token, { conceptId: c1.id, sectionId: c1.sections[0].id, rating: 5, comment: "Love the hero" });
    await submitFeedback(db, token, { conceptId: c1.id, sectionId: c1.sections[0].id, rating: 4, comment: "Actually, bigger logo" });
    await submitFeedback(db, token, { conceptId: c1.id, rating: 4, comment: "Overall good" });
    const summary = await feedbackSummary(db, client.id);
    expect(summary[0].sections[0]).toMatchObject({ rating: 4, comment: "Actually, bigger logo" });
    expect(summary[0].overall?.comment).toBe("Overall good");

    await chooseFavorite(db, token, c1.id);
    const session = await startCheckout(db, token, "TEMPLATE_DOWNLOAD");
    await handlePaymentEvent(db, { type: "checkout.completed", checkoutId: session.checkoutId });
    await handlePaymentEvent(db, { type: "checkout.completed", checkoutId: session.checkoutId }); // webhook retry is harmless
    await runDueJobs(db);

    const after = await db.client.findUniqueOrThrow({ where: { id: client.id }, include: { orders: { include: { delivery: true } } } });
    expect(after.stage).toBe("DELIVERED");
    expect(after.orders[0].status).toBe("FULFILLED");
    expect(after.orders[0].delivery?.downloadUrl).toBeTruthy();
    expect(sentLog.at(-1)!.subject).toMatch(/WordPress template/);
  });

  it("hosted site: provisions a site and records the subscription", async () => {
    const { client, token } = await toInvited();
    const { concepts } = await loadPortal(db, token);
    await chooseFavorite(db, token, concepts[1].id);
    const s = await startCheckout(db, token, "HOSTED_SITE");
    await handlePaymentEvent(db, { type: "checkout.completed", checkoutId: s.checkoutId, subscriptionId: "sub_123" });
    await runDueJobs(db);
    const order = await db.order.findFirstOrThrow({ where: { clientId: client.id }, include: { deployment: true } });
    expect(order).toMatchObject({ status: "FULFILLED", subscriptionId: "sub_123", monthlyCents: 4900 });
    expect(order.deployment?.siteUrl).toMatch(/^https:\/\//);
  });

  it("portal never exposes unapproved concepts and rejects bad tokens", async () => {
    const { token } = await toInvited();
    await expect(loadPortal(db, "nope")).rejects.toThrow(/invalid/);
    const other = await db.client.create({ data: { businessName: "Other", concepts: { create: { name: "x", templateKey: "t", status: "APPROVED" } } }, include: { concepts: true } });
    await expect(chooseFavorite(db, token, other.concepts[0].id)).rejects.toThrow(/Unknown concept/);
  });
});
