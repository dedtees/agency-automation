// Sends through Microsoft 365 / Outlook with the Microsoft Graph API.
// Setup (one time, in Microsoft Entra admin center):
//   1. App registrations > New registration
//   2. API permissions > Microsoft Graph > Application > Mail.Send > Grant admin consent
//   3. Certificates & secrets > New client secret
//   4. Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, OUTLOOK_SENDER and EMAIL_PROVIDER=outlook
// Requires a Microsoft 365 business mailbox (personal outlook.com accounts can't use app permissions).
// Sent mail appears in the sender's Sent Items, so replies thread normally in Outlook.
import { getConfig } from "../../core/config";
import type { EmailProvider } from "./types";

let cached: { token: string; expires: number } | null = null;

async function token(): Promise<string> {
  const o = getConfig().outlook;
  if (!o.tenantId || !o.clientId || !o.clientSecret) throw new Error("Outlook not configured (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET)");
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(`https://login.microsoftonline.com/${o.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: o.clientId, client_secret: o.clientSecret, scope: "https://graph.microsoft.com/.default" }),
  });
  if (!res.ok) throw new Error(`Microsoft token request failed: ${res.status}`);
  const j = await res.json();
  cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

export const outlookEmail: EmailProvider = {
  id: "outlook",
  async send(msg) {
    const sender = getConfig().outlook.sender ?? msg.from;
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject: msg.subject,
          body: msg.html ? { contentType: "HTML", content: msg.html } : { contentType: "Text", content: msg.text },
          toRecipients: [{ emailAddress: { address: msg.to } }],
        },
        saveToSentItems: true,
      }),
    });
    // Graph answers 202 with no body and no message id.
    if (res.status !== 202) throw new Error(`Outlook sendMail failed ${res.status}: ${await res.text()}`);
    return { providerMessageId: `graph-${Date.now()}` };
  },
};
