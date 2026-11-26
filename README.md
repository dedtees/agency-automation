# Agency Automation

Pipeline for a web design agency: bring in existing clients, generate 2–3 WordPress
website concepts each, let clients rate every section in a private portal and pick a
favorite, then take payment for either the template download or a built-and-hosted
WordPress site.

**Status: skeleton.** Everything runs end to end with fake providers. Real
integrations plug in behind the interfaces in `src/integrations/`.

## Quick start

Needs Node 20+ and a Postgres database (local, or a free Supabase project).

```bash
npm install
cp .env.example .env      # set DATABASE_URL / DIRECT_URL
npm run db:migrate
npm run demo              # runs the whole pipeline once in the terminal
npm run dev               # admin at http://localhost:3000/admin
npm run worker            # background jobs (on Vercel, Cron does this)
npm test                  # uses TEST_DATABASE_URL, default postgres://localhost/agency_test
```

To put it online, see [DEPLOY.md](DEPLOY.md) (Vercel + Supabase).

## The pipeline

```
 Intake (manual | QuickBooks export/API | Discord sheet)
   │  de-dupe by source id → email → business name
   ▼
 NEW ──Generate concepts──▶ CONCEPTS_QUEUED ──job──▶ CONCEPTS_IN_REVIEW
                                                      │ ★ you approve concepts
                                                      ▼
                                              READY_TO_INVITE  (invite email drafted)
                                                      │ ★ you approve the email (Outbox)
                                                      ▼
 INVITED ──client opens portal──▶ REVIEWING ──picks favorite──▶ FAVORITE_SELECTED
   ──checkout──▶ CHECKOUT_STARTED ──payment webhook──▶ PAID ──job──▶ FULFILLING ──▶ DELIVERED
                                                         (template link, or site provisioned)
 Any stage ──▶ ON_HOLD / LOST
```

★ = approval gate, on by default (`OUTREACH_REQUIRES_APPROVAL`, `CONCEPTS_REQUIRE_APPROVAL`).
Every stage change is checked against `src/pipeline/stages.ts` and logged as a `PipelineEvent`.

## Layout

| Path | What it is |
|---|---|
| `prisma/schema.prisma` | Data model: Client, ClientSource, Concept, Section, Feedback, PortalAccess, OutboundMessage, Order, TemplateDelivery, Deployment, PipelineEvent, Job |
| `src/pipeline/` | State machine and transition engine |
| `src/intake/` | Intake sources + importer (merge/de-dupe) |
| `src/integrations/` | Swappable providers: `concepts/`, `templates/`, `email/`, `payments/`, `hosting/` and `registry.ts` |
| `src/services/` | Business logic: concepts, portal, outreach, orders/fulfillment |
| `src/jobs/queue.ts` | DB-backed job queue (no Redis needed) |
| `app/admin/` | Owner dashboard: clients, import, approvals, outbox |
| `app/p/[token]/` | Client portal: section ratings, comments, favorite, checkout |
| `app/api/webhooks/payments/[provider]` | Payment webhooks |
| `scripts/` | `worker`, `import`, `demo` |

## Intake sources

| Source | Status | How |
|---|---|---|
| Manual | Ready | Admin form, or `npm run import -- manual clients.json` |
| Discord spreadsheet | Ready | CSV or XLSX. Headers matched loosely (Business, Email, Phone, Niche, City…). Override: `--map businessName="Server Name"` |
| QuickBooks export | Ready | QuickBooks Online → Reports → Customer Contact List → Export |
| QuickBooks API | Stub | Needs an Intuit developer app + OAuth refresh token (`QUICKBOOKS_*`) |

## Providers: what's real vs. stubbed

| Integration | Now | Next |
|---|---|---|
| Research | `npm run audit`: outside-in audit of the client's current site (PHP/WordPress/theme/library versions, security headers, SEO/accessibility/content issues). Profile JSON per client | Extract the profile automatically (AI) instead of writing it by hand |
| Concepts | `library`: 4 starter layouts with placeholder copy. `researched`: two directions written from `Client.profile` (real services, team, results, reviews) | AI-written copy per section, real imagery |
| Templates | `fake`: in-app preview. `wp-block-theme`: real installable block theme (theme.json v3 + patterns, no jQuery, no custom PHP), zipped, signed expiring download links | Staging preview site per concept |
| Email | `console` (logs) | `outlook` adapter (Microsoft Graph) included, `resend` too |
| Payments | `fake` checkout page | `stripe` adapter included (Checkout + webhook signature check); needs keys |
| Hosting | `fake` | SiteGround: theme install over SSH + WP-CLI after the site is created in Site Tools (no public API to create sites) |

## Research and QA

```bash
npm run audit -- https://client-site.com [--save dir]   # findings, worst first
npm run case-study -- case-studies/central-jersey-law   # whole pipeline for one real client, stops at the approval gate
npm run wp:smoke -- --wp-zip wordpress.zip --sqlite-zip sqlite-database-integration.zip \
  --theme storage/themes/<slug> --shots storage/previews  # installs WordPress on local PHP, fails on any PHP warning
```

`wp:smoke` needs only PHP 8.x with pdo_sqlite (no MySQL). Screenshots written to
`storage/previews/` show up in the client portal above each concept.

Case studies live in `case-studies/<client>/` (intake record, researched profile,
saved site snapshot). See `case-studies/central-jersey-law/README.md`.

## Decisions so far
- App on Vercel, database on Supabase (Postgres)
- Email through Outlook (Microsoft 365)
- Client sites hosted on SiteGround
- Payment provider: later (Stripe adapter ready; fake checkout until then)
