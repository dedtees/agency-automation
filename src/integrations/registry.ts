// Picks the active adapter for each integration from config. Add new adapters here.
import { getConfig } from "../core/config";
import { libraryGenerator } from "./concepts/library";
import { researchedGenerator } from "./concepts/researched";
import type { ConceptGenerator } from "./concepts/types";
import { consoleEmail } from "./email/console";
import { resendEmail } from "./email/resend";
import type { EmailProvider } from "./email/types";
import { fakeHosting } from "./hosting/fake";
import type { HostingProvider } from "./hosting/types";
import { fakePayments } from "./payments/fake";
import { stripePayments } from "./payments/stripe";
import type { PaymentProvider } from "./payments/types";
import { fakeTemplateBuilder } from "./templates/fake";
import { wpBlockThemeBuilder } from "./templates/wpBlockTheme";
import type { TemplateBuilder } from "./templates/types";

const pick = <T>(kind: string, map: Record<string, T>, id: string): T => {
  const v = map[id];
  if (!v) throw new Error(`Unknown ${kind} provider "${id}". Options: ${Object.keys(map).join(", ")}`);
  return v;
};

export const providers = {
  concepts: (): ConceptGenerator => pick("concepts", { library: libraryGenerator, researched: researchedGenerator }, getConfig().providers.concepts),
  templates: (): TemplateBuilder => pick("templates", { fake: fakeTemplateBuilder, "wp-block-theme": wpBlockThemeBuilder }, getConfig().providers.templates),
  email: (): EmailProvider => pick("email", { console: consoleEmail, resend: resendEmail }, getConfig().providers.email),
  payments: (id = getConfig().providers.payments): PaymentProvider => pick("payments", { fake: fakePayments, stripe: stripePayments }, id),
  hosting: (): HostingProvider => pick("hosting", { fake: fakeHosting }, getConfig().providers.hosting),
};
