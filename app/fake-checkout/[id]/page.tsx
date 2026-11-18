// Stand-in for the payment provider's hosted checkout page (PAYMENT_PROVIDER=fake only).
import { notFound, redirect } from "next/navigation";
import { getConfig } from "@/core/config";
import { db } from "@/core/db";
import { runDueJobs } from "@/jobs/queue";
import { handlePaymentEvent } from "@/services/orders";

export const dynamic = "force-dynamic";

export default async function FakeCheckout({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ return?: string }> }) {
  if (getConfig().providers.payments !== "fake") notFound();
  const { id } = await params;
  const back = (await searchParams).return;
  // Only follow same-app return links.
  const returnTo = back && back.startsWith(getConfig().appUrl) ? back : "/";
  const order = await db.order.findUnique({ where: { checkoutId: id }, include: { client: true, concept: true } });
  if (!order) notFound();
  async function pay() {
    "use server";
    await handlePaymentEvent(db, { type: "checkout.completed", checkoutId: id, subscriptionId: order!.monthlyCents ? `fake_sub_${order!.id}` : undefined });
    await runDueJobs(db);
    redirect(returnTo);
  }
  return (
    <main>
      <div className="card">
        <h1>Test checkout</h1>
        <p>{order.client.businessName}: {order.concept.name} ({order.offer})</p>
        <p>${(order.oneTimeCents / 100).toFixed(2)}{order.monthlyCents ? ` + $${(order.monthlyCents / 100).toFixed(2)}/mo` : ""}</p>
        <form action={pay}><button className="primary">Simulate successful payment</button></form>
      </div>
    </main>
  );
}
