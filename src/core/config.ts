// All runtime settings in one place. Every provider is chosen by env var so
// it can be swapped without touching pipeline code.
import type { OfferKind } from "./types";

const bool = (v: string | undefined, d: boolean) => (v == null || v === "" ? d : /^(1|true|yes)$/i.test(v));
const int = (v: string | undefined, d: number) => (v ? parseInt(v, 10) : d);

export function getConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    appUrl: env.APP_URL ?? "http://localhost:3000",
    agencyName: env.AGENCY_NAME ?? "Your Agency",
    agencyFromEmail: env.AGENCY_FROM_EMAIL ?? "hello@example.com",

    /** Eric must approve every outbound email before it sends. */
    outreachRequiresApproval: bool(env.OUTREACH_REQUIRES_APPROVAL, true),
    /** Eric must approve generated concepts before a client can see them. */
    conceptsRequireApproval: bool(env.CONCEPTS_REQUIRE_APPROVAL, true),
    conceptsPerClient: int(env.CONCEPTS_PER_CLIENT, 3),
    portalLinkDays: int(env.PORTAL_LINK_DAYS, 30),

    providers: {
      concepts: env.CONCEPT_PROVIDER ?? "library",   // library | claude (later)
      templates: env.TEMPLATE_PROVIDER ?? "fake",     // fake | wp-block-theme (later)
      email: env.EMAIL_PROVIDER ?? "console",         // console | resend | smtp | gmail
      payments: env.PAYMENT_PROVIDER ?? "fake",       // fake | stripe
      hosting: env.HOSTING_PROVIDER ?? "fake",        // fake | wp-engine | kinsta | vps-wpcli ...
    },

    pricing: {
      TEMPLATE_DOWNLOAD: { oneTimeCents: int(env.PRICE_TEMPLATE_CENTS, 49_900), monthlyCents: null },
      HOSTED_SITE: {
        oneTimeCents: int(env.PRICE_SETUP_CENTS, 99_900),
        monthlyCents: int(env.PRICE_MONTHLY_CENTS, 4_900),
      },
    } satisfies Record<OfferKind, { oneTimeCents: number; monthlyCents: number | null }>,

    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    quickbooks: {
      clientId: env.QUICKBOOKS_CLIENT_ID,
      clientSecret: env.QUICKBOOKS_CLIENT_SECRET,
      realmId: env.QUICKBOOKS_REALM_ID,
      refreshToken: env.QUICKBOOKS_REFRESH_TOKEN,
      environment: (env.QUICKBOOKS_ENV ?? "sandbox") as "sandbox" | "production",
    },
    adminPassword: env.ADMIN_PASSWORD,
  };
}
export type AppConfig = ReturnType<typeof getConfig>;
