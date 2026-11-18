"use server";
// Client portal actions. The token in the URL is the client's credential.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import type { OfferKind } from "@/core/types";
import { startCheckout } from "@/services/orders";
import { chooseFavorite, submitFeedback } from "@/services/portal";

export async function saveFeedbackAction(token: string, input: { conceptId: string; sectionId?: string | null; rating?: number; comment?: string }) {
  await submitFeedback(db, token, input);
  revalidatePath(`/p/${token}`);
}

export async function favoriteAction(token: string, conceptId: string) {
  await chooseFavorite(db, token, conceptId);
  revalidatePath(`/p/${token}`);
}

export async function checkoutAction(token: string, offer: OfferKind) {
  const session = await startCheckout(db, token, offer);
  redirect(session.url);
}
