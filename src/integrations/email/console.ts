// Logs instead of sending. Keeps an in-memory outbox so tests can assert on it.
import type { EmailMessage, EmailProvider } from "./types";

export const sentLog: EmailMessage[] = [];

export const consoleEmail: EmailProvider = {
  id: "console",
  async send(msg) {
    sentLog.push(msg);
    if (process.env.NODE_ENV !== "test") console.log(`[email:console] to=${msg.to} subject="${msg.subject}"`);
    return { providerMessageId: `console-${sentLog.length}` };
  },
};
