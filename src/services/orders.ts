// Checkout and fulfillment for both offers:
//  TEMPLATE_DOWNLOAD: one-time payment -> download link email
//  HOSTED_SITE:       setup fee + monthly -> provision WordPress site -> launch email
import { getConfig } from "../core/config";
import type { Db } from "../core/db";
import type { OfferKind } from "../core/types";
import { providers } from "../integrations/registry";
import type { PaymentEvent } from "../integrations/payments/types";
import { logEvent, transition } from "../pipeline/engine";
import { queueMessage } from "./outreach";
import { resolvePortal } from "./portal";

export async function startCheckout(db: Db, token: string, offer: OfferKind) {
  const { clientId } = await resolvePortal(db, token);
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  if (!client.favoriteConceptId) throw new Error("Pick a favorite concept first");
  const concept = await db.concept.findUniqueOrThrow({ where: { id: client.favoriteConceptId } });
  const cfg = getConfig();
  const price = cfg.pricing[offer];
  const pay = providers.payments();

  const order = await db.order.create({
    data: { clientId, conceptId: concept.id, offer, oneTimeCents: price.oneTimeCents, monthlyCents: price.monthlyCents, paymentProvider: pay.id },
  });
  const session = await pay.createCheckout({
    orderId: order.id, offer, customerEmail: client.email, currency: order.currency,
    description: `${concept.name} website ${offer === "HOSTED_SITE" ? "(built & hosted)" : "(WordPress template)"}`,
    oneTimeCents: price.oneTimeCents, monthlyCents: price.monthlyCents,
    successUrl: `${cfg.appUrl}/p/${token}?paid=${order.id}`, cancelUrl: `${cfg.appUrl}/p/${token}`,
  });
  await db.order.update({ where: { id: order.id }, data: { checkoutId: session.checkoutId, checkoutUrl: session.url } });
  await transition(db, clientId, "CHECKOUT_CREATED", { actor: "client", data: { orderId: order.id, offer } });
  return session;
}

/** Applies a normalized payment event. Safe to call twice for the same event. */
export async function handlePaymentEvent(db: Db, evt: PaymentEvent) {
  if (evt.type !== "checkout.completed") {
    if (evt.type === "subscription.canceled") {
      const order = await db.order.findFirst({ where: { subscriptionId: evt.subscriptionId }, include: { deployment: true } });
      if (order?.deployment) await db.job.create({ data: { type: "SUSPEND_SITE", payload: { orderId: order.id } } });
    }
    return;
  }
  const order = await db.order.findFirst({ where: { OR: [{ checkoutId: evt.checkoutId }, ...(evt.orderId ? [{ id: evt.orderId }] : [])] } });
  if (!order) throw new Error(`No order for checkout ${evt.checkoutId}`);
  if (order.status !== "PENDING") return; // already processed
  await db.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), subscriptionId: evt.subscriptionId } });
  await transition(db, order.clientId, "PAYMENT_CONFIRMED", { data: { orderId: order.id } });
  await db.job.create({ data: { type: "FULFILL_ORDER", payload: { orderId: order.id } } });
}

export async function fulfillOrder(db: Db, orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { client: true, concept: true } });
  if (order.status !== "PAID") return;
  await db.order.update({ where: { id: orderId }, data: { status: "FULFILLING" } });
  await transition(db, order.clientId, "FULFILLMENT_STARTED", { data: { orderId } });
  if (!order.concept.packagePath) throw new Error("Concept has no built package");

  let subject: string, body: string;
  if (order.offer === "TEMPLATE_DOWNLOAD") {
    const url = await providers.templates().downloadUrl(order.concept.packagePath, 7 * 86_400);
    await db.templateDelivery.create({ data: { orderId, downloadUrl: url, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    subject = `Your ${order.concept.name} WordPress template`;
    body = `Thanks for your purchase! Download your theme here (link valid 7 days):\n${url}\n\nInstall: WordPress admin > Appearance > Themes > Add New > Upload Theme.`;
  } else {
    const host = providers.hosting();
    const r = await host.provision({
      orderId, businessName: order.client.businessName, desiredDomain: order.client.website,
      themePackagePath: order.concept.packagePath, adminEmail: order.client.email ?? getConfig().agencyFromEmail,
    });
    await db.deployment.create({ data: { orderId, provider: host.id, status: r.status, siteUrl: r.siteUrl, adminUrl: r.adminUrl, externalId: r.externalId } });
    subject = `Your new website is live`;
    body = `Your site is up at ${r.siteUrl}\nWe'll be in touch about connecting your domain.`;
  }
  // Transactional emails skip approval: the client just paid and expects them.
  await queueMessage(db, { clientId: order.clientId, kind: "DELIVERY", subject, body, requireApproval: false });
  await db.order.update({ where: { id: orderId }, data: { status: "FULFILLED" } });
  await transition(db, order.clientId, "FULFILLMENT_COMPLETE", { data: { orderId } });
  await logEvent(db, order.clientId, "ORDER_FULFILLED", { orderId, offer: order.offer });
}
