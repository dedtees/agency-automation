// Example real provider (Resend HTTP API). Enable with EMAIL_PROVIDER=resend + RESEND_API_KEY.
// Gmail (via Eric's account) or SMTP would follow the same interface.
import type { EmailProvider } from "./types";

export const resendEmail: EmailProvider = {
  id: "resend",
  async send(msg) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: msg.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return { providerMessageId: (await res.json()).id };
  },
};
