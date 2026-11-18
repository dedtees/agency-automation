# Agency Automation

Pipeline for a web design agency: bring in existing clients, generate 2–3 WordPress
website concepts each, let clients rate every section in a private portal and pick a
favorite, then take payment for either the template download or a built-and-hosted
WordPress site.

**Status: skeleton.** Everything runs end to end with fake providers. Real
integrations plug in behind the interfaces in `src/integrations/`.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma db push
npm run demo        # runs the whole pipeline once in the terminal
npm run dev         # admin at http://localhost:3000/admin
npm run worker      # background jobs (the admin also has a "Run jobs now" button)
npm test
```

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
| Concepts | `library`: 4 starter layouts with placeholder copy | AI-written copy per section, real imagery |
| Templates | `fake`: in-app preview | Generate a WordPress block theme (theme.json + patterns), zip, store, staging preview |
| Email | `console` (logs) | `resend` adapter included; Gmail/SMTP possible |
| Payments | `fake` checkout page | `stripe` adapter included (Checkout + webhook signature check); needs keys |
| Hosting | `fake` | Pick a host: managed WP API, or VPS + WP-CLI |

## Open decisions
- Hosting provider for built sites
- Payment provider (Stripe adapter is ready)
- Email sender (Resend vs. Gmail vs. SMTP) and whether outreach ever skips approval
- Production database host (Postgres) and app host
