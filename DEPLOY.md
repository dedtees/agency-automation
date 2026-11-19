# Deploy the prototype (Vercel + Supabase)

About 10 minutes. Everything stays in test mode: emails are only logged, payments
use a test checkout page, and hosting is simulated.

## 1. Create the database (Supabase)
1. supabase.com > New project. Pick the US East region (closest to New Jersey and to Vercel's default region). Save the database password.
2. Open the project > **Connect** (top bar) > **ORMs** > **Prisma**. Copy the two strings:
   - `DATABASE_URL` (port 6543, ends with `?pgbouncer=true`)
   - `DIRECT_URL` (port 5432)
   Put your database password where they say `[YOUR-PASSWORD]`.

## 2. Create the app (Vercel)
1. vercel.com > Add New > Project > import `dedtees/agency-automation`.
2. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | from Supabase (pooled, port 6543) |
| `DIRECT_URL` | from Supabase (direct, port 5432) |
| `ADMIN_PASSWORD` | a password for the admin pages (username is `admin`) |
| `CRON_SECRET` | any long random string |
| `AGENCY_NAME` | your agency's name (shown in emails) |

3. Deploy. The build creates the database tables automatically. Tick **Production** and **Preview** for each variable so pull-request previews work too. (Without the database variables the deploy still succeeds, and the admin page tells you what is missing.)

## 3. Try it
1. Open `https://<your-project>.vercel.app/admin` and sign in as `admin`.
2. Click **load 4 sample clients** (or import your own spreadsheet).
3. Open a client > **Generate concepts** > **Approve selected**.
4. **View portal as client** shows what the client sees. Rate sections, pick a favorite, try a checkout.
5. **Outbox** shows the invite email waiting for your approval.

## Later: turn on real services
- **Outlook email:** register an app in Microsoft Entra with the Mail.Send application permission (steps at the top of `src/integrations/email/outlook.ts`), then set `EMAIL_PROVIDER=outlook`, `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `OUTLOOK_SENDER`.
- **Payments:** set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and point a Stripe webhook at `/api/webhooks/payments/stripe`.
- **Background jobs** run every minute via Vercel Cron (`vercel.json`), plus immediately after admin actions.
