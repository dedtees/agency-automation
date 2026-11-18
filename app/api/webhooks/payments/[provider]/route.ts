// Payment webhooks: POST /api/webhooks/payments/stripe (or /fake).
import { NextResponse } from "next/server";
import { db } from "@/core/db";
import { providers } from "@/integrations/registry";
import { handlePaymentEvent } from "@/services/orders";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await req.text();
  try {
    const evt = await providers.payments(provider).parseWebhook(raw, req.headers);
    await handlePaymentEvent(db, evt);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[webhook]", provider, e?.message);
    return NextResponse.json({ error: "bad webhook" }, { status: 400 });
  }
}
