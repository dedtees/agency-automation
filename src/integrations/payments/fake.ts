// Fake provider: the "checkout URL" is an in-app page with a Pay button that
// posts a fake webhook. Lets the whole purchase flow run locally.
import { getConfig } from "../../core/config";
import type { PaymentProvider } from "./types";

export const fakePayments: PaymentProvider = {
  id: "fake",
  async createCheckout(req) {
    const checkoutId = `fake_cs_${req.orderId}`;
    return { checkoutId, url: `${getConfig().appUrl}/fake-checkout/${checkoutId}?return=${encodeURIComponent(req.successUrl)}` };
  },
  async parseWebhook(rawBody) {
    const body = JSON.parse(rawBody);
    if (body.type === "checkout.completed") return { type: "checkout.completed", checkoutId: body.checkoutId, subscriptionId: body.subscriptionId };
    return { type: "ignored" };
  },
};
