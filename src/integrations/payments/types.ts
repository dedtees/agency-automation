import type { OfferKind } from "../../core/types";

export interface CheckoutRequest {
  orderId: string;
  offer: OfferKind;
  customerEmail?: string | null;
  description: string;
  currency: string;
  oneTimeCents: number;
  monthlyCents?: number | null; // HOSTED_SITE: setup fee + subscription
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  checkoutId: string;
  url: string;
}

/** Normalized payment events coming back from a provider webhook. */
export type PaymentEvent =
  | { type: "checkout.completed"; checkoutId: string; orderId?: string; subscriptionId?: string }
  | { type: "subscription.canceled"; subscriptionId: string }
  | { type: "payment.refunded"; checkoutId: string }
  | { type: "ignored" };

export interface PaymentProvider {
  id: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verify signature and convert a raw webhook into a PaymentEvent. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}
