export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}
export interface EmailProvider {
  id: string;
  send(msg: EmailMessage): Promise<{ providerMessageId: string }>;
}
