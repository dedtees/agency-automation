// Stripe Checkout via the REST API (no SDK dependency until we commit to Stripe).
// TEMPLATE_DOWNLOAD -> mode=payment. HOSTED_SITE -> mode=subscription with the
// monthly price plus the setup fee as a one-time line item on the first invoice.
// TODO before go-live: verify webhook signatures (Stripe-Signature, HMAC-SHA256 with
// STRIPE_WEBHOOK_SECRET), use Stripe Price IDs instead of inline price_data if preferred.
import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "../../core/config";
import type { PaymentProvider } from "./types";

function form(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, String(v));
  return p;
}

export const stripePayments: PaymentProvider = {
  id: "stripe",
  async createCheckout(req) {
    const key = getConfig().stripe.secretKey;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    const fields: Record<string, string | number | undefined> = {
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      client_reference_id: req.orderId,
      "metadata[orderId]": req.orderId,
      customer_email: req.customerEmail ?? undefined,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": req.currency,
      "line_items[0][price_data][unit_amount]": req.oneTimeCents,
      "line_items[0][price_data][product_data][name]": req.description,
    };
    if (req.monthlyCents) {
      fields.mode = "subscription";
      fields["line_items[0][price_data][product_data][name]"] = `${req.description} (setup)`;
      Object.assign(fields, {
        "line_items[1][quantity]": 1,
        "line_items[1][price_data][currency]": req.currency,
        "line_items[1][price_data][unit_amount]": req.monthlyCents,
        "line_items[1][price_data][recurring][interval]": "month",
        "line_items[1][price_data][product_data][name]": "Hosting & maintenance",
        "subscription_data[metadata][orderId]": req.orderId,
      });
    } else fields.mode = "payment";

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form(fields),
    });
    if (!res.ok) throw new Error(`Stripe error ${res.status}: ${await res.text()}`);
    const s = await res.json();
    return { checkoutId: s.id, url: s.url };
  },

  async parseWebhook(rawBody, headers) {
    const secret = getConfig().stripe.webhookSecret;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    verifyStripeSignature(rawBody, headers.get("stripe-signature") ?? "", secret);
    const evt = JSON.parse(rawBody);
    const o = evt.data?.object ?? {};
    switch (evt.type) {
      case "checkout.session.completed":
        return { type: "checkout.completed", checkoutId: o.id, orderId: o.metadata?.orderId, subscriptionId: o.subscription ?? undefined };
      case "customer.subscription.deleted":
        return { type: "subscription.canceled", subscriptionId: o.id };
      case "charge.refunded":
        return { type: "ignored" }; // TODO map refund -> checkout via payment_intent lookup
      default:
        return { type: "ignored" };
    }
  },
};

export function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSec = 300) {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1) throw new Error("Invalid Stripe-Signature header");
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) throw new Error("Stripe webhook timestamp outside tolerance");
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Stripe signature mismatch");
}
