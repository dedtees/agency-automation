import { afterEach, describe, expect, it, vi } from "vitest";
import { outlookEmail } from "../src/integrations/email/outlook";

afterEach(() => vi.unstubAllGlobals());

describe("outlook email", () => {
  it("gets a Graph token and sends from the configured mailbox", async () => {
    Object.assign(process.env, { MS_TENANT_ID: "t1", MS_CLIENT_ID: "c1", MS_CLIENT_SECRET: "s1", OUTLOOK_SENDER: "hello@agency.test" });
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: String(init.body) });
      return url.includes("login.microsoftonline.com")
        ? new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 })
        : new Response(null, { status: 202 });
    }));
    await outlookEmail.send({ to: "client@x.test", from: "ignored@x.test", subject: "Hi", text: "Body" });
    expect(calls[0].url).toBe("https://login.microsoftonline.com/t1/oauth2/v2.0/token");
    expect(calls[1].url).toBe("https://graph.microsoft.com/v1.0/users/hello%40agency.test/sendMail");
    expect(JSON.parse(calls[1].body).message.toRecipients[0].emailAddress.address).toBe("client@x.test");
  });
});
