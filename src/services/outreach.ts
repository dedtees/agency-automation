// Outbound email. Every message is stored first; with approval on (default),
// it waits as PENDING_APPROVAL until Eric approves it in the outbox.
import { getConfig } from "../core/config";
import type { Db } from "../core/db";
import type { MessageKind } from "../core/types";
import { providers } from "../integrations/registry";
import { logEvent, transition } from "../pipeline/engine";
import { createPortalLink } from "./portal";

export async function queueMessage(db: Db, args: { clientId: string; kind: MessageKind; subject: string; body: string; requireApproval?: boolean }) {
  const client = await db.client.findUniqueOrThrow({ where: { id: args.clientId } });
  if (!client.email) throw new Error(`${client.businessName} has no email address`);
  const needsApproval = args.requireApproval ?? getConfig().outreachRequiresApproval;
  const msg = await db.outboundMessage.create({
    data: { clientId: client.id, kind: args.kind, toEmail: client.email, subject: args.subject, body: args.body, status: needsApproval ? "PENDING_APPROVAL" : "APPROVED" },
  });
  if (!needsApproval) await db.job.create({ data: { type: "SEND_MESSAGE", payload: { messageId: msg.id } } });
  return msg;
}

/** Drafts the "your concepts are ready" email with a fresh private portal link. */
export async function draftPortalInvite(db: Db, clientId: string) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const { url } = await createPortalLink(db, clientId);
  const cfg = getConfig();
  const name = client.contactName?.split(" ")[0] || "there";
  return queueMessage(db, {
    clientId, kind: "PORTAL_INVITE",
    subject: `${client.businessName}: a few website ideas for you`,
    body: [
      `Hi ${name},`,
      ``,
      `We put together a few website concepts for ${client.businessName}. You can look through them here:`,
      url,
      ``,
      `Rate each section, leave comments on anything you'd change, and mark the one you like best.`,
      `You can buy the design as a WordPress template, or have us build and host the site for you.`,
      ``,
      `${cfg.agencyName}`,
    ].join("\n"),
  });
}

export async function approveMessage(db: Db, messageId: string, approvedBy = "owner", edits?: { subject?: string; body?: string }) {
  const msg = await db.outboundMessage.update({
    where: { id: messageId, status: "PENDING_APPROVAL" },
    data: { status: "APPROVED", approvedBy, approvedAt: new Date(), ...edits },
  });
  await db.job.create({ data: { type: "SEND_MESSAGE", payload: { messageId } } });
  return msg;
}

export async function rejectMessage(db: Db, messageId: string) {
  return db.outboundMessage.update({ where: { id: messageId, status: "PENDING_APPROVAL" }, data: { status: "REJECTED" } });
}

/** Called by the worker. Only APPROVED messages can ever be sent. */
export async function sendMessage(db: Db, messageId: string) {
  const msg = await db.outboundMessage.findUniqueOrThrow({ where: { id: messageId } });
  if (msg.status !== "APPROVED") throw new Error(`Message ${messageId} is ${msg.status}, not APPROVED`);
  const email = providers.email();
  const { providerMessageId } = await email.send({ to: msg.toEmail, from: getConfig().agencyFromEmail, subject: msg.subject, text: msg.body });
  await db.outboundMessage.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: new Date(), provider: email.id, providerMessageId } });
  await logEvent(db, msg.clientId, "EMAIL_SENT", { kind: msg.kind, messageId });
  if (msg.kind === "PORTAL_INVITE") await transition(db, msg.clientId, "INVITE_SENT", { allowNoop: true });
}
