// Fake host: pretends the site went live instantly.
// Real options to evaluate: a managed WP host API (WP Engine, Kinsta, Cloudways),
// or our own VPS driven by WP-CLI over SSH (install WP, upload theme zip, activate).
import { slug } from "../../intake/tabular";
import type { HostingProvider } from "./types";

export const fakeHosting: HostingProvider = {
  id: "fake",
  async provision(req) {
    const s = slug(req.businessName) || req.orderId;
    return { externalId: `fake-site-${req.orderId}`, siteUrl: `https://${s}.example-sites.test`, adminUrl: `https://${s}.example-sites.test/wp-admin`, status: "LIVE" };
  },
  async status() { return "LIVE"; },
  async suspend() {},
};
